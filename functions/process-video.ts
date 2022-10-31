import type { SQSEvent } from "aws-lambda";
import { dynamodbClientV3 } from "./common/dynamodb-client";
import { s3ClientV3 } from "./common/s3-client";

import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import middy from "@middy/core";
import { injectLambdaContext } from "@aws-lambda-powertools/logger";
import { captureLambdaHandler } from "@aws-lambda-powertools/tracer";
import { PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { logger, metrics, tracer } from "./common/powertools";
import { logMetrics, MetricUnits } from "@aws-lambda-powertools/metrics";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { Subsegment } from "aws-xray-sdk-core";
import ffmpeg from "fluent-ffmpeg";

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

const getTransformParams = async (fileId: string) => {
  const res = await dynamodbClientV3.get({
    TableName: dynamoDBTableFiles,
    Key: {
      id: fileId,
    },
    ProjectionExpression: "transformParams",
  });
  return res.Item;
};

const processVideo = async (
  presignedUrlOriginalVideo: string,
  { width }: TransformParams,
  newFileId: string
): Promise<void> =>
  new Promise((resolve, reject) => {
    ffmpeg(presignedUrlOriginalVideo)
      .size(`${width}x?`)
      .on("error", (err) => reject(err))
      .on("end", () => {
        logger.info("Processing finished !");
        resolve();
      })
      .save(`/tmp/${newFileId}.webm`);
  });

const markFileAs = async (fileId: string, status: string) => {
  await dynamodbClientV3.update({
    TableName: dynamoDBTableFiles,
    Key: {
      id: fileId,
    },
    UpdateExpression: "set #status = :val",
    ExpressionAttributeNames: {
      "#status": "status",
    },
    ExpressionAttributeValues: {
      ":val": status,
    },
  });
};

export const handler = middy(async (event: SQSEvent, context: unknown) => {
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
      const newFileId = randomUUID();
      await tracer.provider.captureAsyncFunc(
        "### process video",
        async (subsegment?: Subsegment) => {
          subsegment?.addAnnotation("fileId", fileId);
          try {
            await processVideo(
              presignedUrlOriginalVideo,
              {
                width: 480,
              },
              newFileId
            ); // TODO: use transformParams
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
      const newFileKey = `transformed/video/webm/${newFileId}.webm`;
      await saveProcessedObject(
        newFileKey,
        s3BucketFiles,
        `/tmp/${newFileId}.webm`
      );
      metrics.addMetric("processedVideos", MetricUnits.Count, 1);
      await markFileAs(fileId, "completed");
    })
  );
})
  .use(captureLambdaHandler(tracer))
  .use(injectLambdaContext(logger, { logEvent: true }))
  .use(logMetrics(metrics));
