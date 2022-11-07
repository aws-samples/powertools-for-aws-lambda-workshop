import type { Callback, SQSEvent } from "aws-lambda";
import { appSyncIamClient } from "./common/appsync-iam-client";
import { updateFileStatus } from "./common/graphql/mutations";
import { dynamodbClientV3 } from "./common/dynamodb-client";
import { s3ClientV3 } from "./common/s3-client";
import type { FileStatus } from "./common/types/File";

import { injectLambdaContext } from "@aws-lambda-powertools/logger";
import { logMetrics, MetricUnits } from "@aws-lambda-powertools/metrics";
import { captureLambdaHandler } from "@aws-lambda-powertools/tracer";
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import middy, { MiddyfiedHandler } from "@middy/core";
import type { Subsegment } from "aws-xray-sdk-core";
import ffmpeg from "fluent-ffmpeg";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { logger, metrics, tracer } from "./common/powertools";

const dynamoDBTableFiles = process.env.TABLE_NAME_FILES || "";
const s3BucketFiles = process.env.BUCKET_NAME_FILES || "";

const getPresignedUrl = async (
  key: string,
  bucketName: string
): Promise<string> => {
  return await getSignedUrl(
    s3ClientV3,
    new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    }),
    {
      expiresIn: 3600,
    }
  );
};

const saveProcessedObject = async (
  key: string,
  bucketName: string,
  pathToFile: string
) => {
  const fileBody = await readFile(pathToFile);
  await s3ClientV3.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: fileBody,
    })
  );
};

type TransformParams = {
  width: number;
  height?: number;
};

const getTransformParams = async (fileId: string): Promise<TransformParams> => {
  const res = await dynamodbClientV3.get({
    TableName: dynamoDBTableFiles,
    Key: {
      id: fileId,
    },
    ProjectionExpression: "transformParams",
  });

  if (!res.Item) throw new Error(`Unable to find item with id ${fileId}`);

  switch (res.Item.transformParams) {
    case "480p":
      return { width: 720, height: 480 };
    case "720p":
      return { width: 1280, height: 720 };
    case "1080p":
      return { width: 1920, height: 1080 };
    default:
      return { width: 720, height: 480 };
  }
};

const processVideo = async (
  presignedUrlOriginalVideo: string,
  { width, height }: TransformParams,
  newFileId: string
): Promise<void> =>
  new Promise((resolve, reject) => {
    ffmpeg(presignedUrlOriginalVideo)
      .size(`${width}x${height}`)
      .on("error", (err) => reject(err))
      .on("end", () => {
        logger.info("Processing finished !");
        resolve();
      })
      .save(`/tmp/${newFileId}.webm`);
  });

const markFileAs = async (fileId: string, status: FileStatus) => {
  const graphQLOperation = {
    query: updateFileStatus,
    operationName: "UpdateFileStatus",
    variables: {
      input: {
        id: fileId,
        status,
      },
    },
  };
  await appSyncIamClient.send(graphQLOperation);
};
export const handler = middy(async (event: SQSEvent) => {
  const mainSubsegment = tracer.getSegment();
  await Promise.all(
    event.Records.map(async (record) => {
      const { body } = record;
      const {
        detail: {
          object: { key },
        },
      } = JSON.parse(body);
      logger.info(key);
      const file = key.split("/").at(-1);
      const fileId = file.split(".")[0];
      await markFileAs(fileId, "in-progress");
      const presignedUrlOriginalVideo = await getPresignedUrl(
        key,
        s3BucketFiles
      );
      const transformParams = await getTransformParams(fileId);
      await tracer.provider.captureAsyncFunc(
        "### process video",
        async (subsegment?: Subsegment) => {
          subsegment?.addAnnotation("fileId", fileId);
          try {
            await processVideo(
              presignedUrlOriginalVideo,
              transformParams,
              fileId
            );
          } catch (err) {
            subsegment?.addErrorFlag();
            subsegment?.addError(err, false);
            logger.error(`Error processing video`, {
              details: fileId,
              error: err,
            });
            throw err;
          } finally {
            subsegment?.close();
            subsegment?.flush();
          }
        },
        mainSubsegment
      );
      const newFileKey = `transformed/video/webm/${fileId}.webm`;
      await saveProcessedObject(
        newFileKey,
        s3BucketFiles,
        `/tmp/${fileId}.webm`
      );
      metrics.addMetric("processedVideos", MetricUnits.Count, 1);
      await markFileAs(fileId, "completed");
      logger.info("Saved video on S3", { details: newFileKey });
    })
  );
})
  .use(captureLambdaHandler(tracer))
  .use(injectLambdaContext(logger, { logEvent: true }))
  .use(logMetrics(metrics));
