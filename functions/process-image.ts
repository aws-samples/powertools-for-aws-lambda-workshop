import type { SQSEvent } from "aws-lambda";
import { appSyncIamClient } from "./common/appsync-iam-client";
import { updateFileStatus } from "./common/graphql/mutations";
import { dynamodbClientV3 } from "./common/dynamodb-client";
import { s3ClientV3 } from "./common/s3-client";
import type { FileStatus } from "./common/types/File";

import { injectLambdaContext } from "@aws-lambda-powertools/logger";
import { logMetrics, MetricUnits } from "@aws-lambda-powertools/metrics";
import { captureLambdaHandler } from "@aws-lambda-powertools/tracer";
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import middy from "@middy/core";
import { randomUUID } from "node:crypto";
import { Readable } from "node:stream";
import sharp from "sharp";
import { logger, metrics, tracer } from "./common/powertools";

const dynamoDBTableFiles = process.env.TABLE_NAME_FILES || "";
const s3BucketFiles = process.env.BUCKET_NAME_FILES || "";

const getOriginalObject = async (
  key: string,
  bucketName: string
): Promise<Buffer> => {
  const res = await s3ClientV3.send(
    new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    })
  );
  const stream = res.Body! as Readable;
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on("data", (chunk) => chunks.push(chunk));
    stream.once("end", () => resolve(Buffer.concat(chunks)));
    stream.once("error", reject);
  });
};

const saveProcessedObject = async (
  key: string,
  bucketName: string,
  body: Buffer
) => {
  await s3ClientV3.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: body,
    })
  );
};

type TransformParams = {
  width: number;
  height: number;
};

const getTransformParams = async (fileId: string) => {
  const res = await dynamodbClientV3.get({
    TableName: dynamoDBTableFiles,
    Key: {
      id: fileId,
    },
    ProjectionExpression: "transformParams",
  });

  if (!res.Item) throw new Error(`Unable to find item with id ${fileId}`);

  switch (res.Item.transformParams) {
    case "small":
      return { width: 720, height: 480 };
    case "medium":
      return { width: 1280, height: 720 };
    case "large":
      return { width: 1920, height: 1080 };
    default:
      return { width: 720, height: 480 };
  }
};

const processImage = async (
  originalImage: Buffer,
  { width, height }: TransformParams
): Promise<Buffer> => {
  const resizedImg = await sharp(originalImage)
    .resize(width, height)
    .toFormat("webp")
    .toBuffer();
  return resizedImg;
};

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

export const handler = middy(async (event: SQSEvent, context: unknown) => {
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
      const originalImage = await getOriginalObject(key, s3BucketFiles);
      const transformParams = await getTransformParams(fileId);
      const processedImage = await processImage(originalImage, transformParams);
      const newFileKey = `transformed/image/webp/${fileId}.webp`;
      await saveProcessedObject(newFileKey, s3BucketFiles, processedImage);
      metrics.addMetric("processedImages", MetricUnits.Count, 1);
      await markFileAs(fileId, "completed");
    })
  );
})
  .use(captureLambdaHandler(tracer))
  .use(injectLambdaContext(logger, { logEvent: true }))
  .use(logMetrics(metrics));
