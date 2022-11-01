import type { SQSEvent } from "aws-lambda";
import type { FileStatus } from "./common/types/File";
import { dynamodbClientV3 } from "./common/dynamodb-client";
import { s3ClientV3 } from "./common/s3-client";
import { appSyncIamClient } from "./common/appsync-iam-client";
import { UpdateFileStatusMutation } from "./common/appsync-queries";
import sharp from "sharp";

import { randomUUID } from "node:crypto";
import { Readable } from "node:stream";
import middy from "@middy/core";
import { injectLambdaContext } from "@aws-lambda-powertools/logger";
import { captureLambdaHandler } from "@aws-lambda-powertools/tracer";
import { PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { logger, metrics, tracer } from "./common/powertools";
import { logMetrics, MetricUnits } from "@aws-lambda-powertools/metrics";

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
  return res.Item;
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
    query: UpdateFileStatusMutation,
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
      const processedImage = await processImage(originalImage, {
        width: 120,
        height: 180,
      }); // TODO: use transformParams
      const newFileId = randomUUID();
      const newFileKey = `transformed/image/webp/${newFileId}.webp`;
      await saveProcessedObject(newFileKey, s3BucketFiles, processedImage);
      metrics.addMetric("processedImages", MetricUnits.Count, 1);
      await markFileAs(fileId, "completed");
    })
  );
})
  .use(captureLambdaHandler(tracer))
  .use(injectLambdaContext(logger, { logEvent: true }))
  .use(logMetrics(metrics));
