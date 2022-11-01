import type { AppSyncResolverEvent } from "aws-lambda";
import { logger, tracer } from "./common/powertools";
import { dynamodbClientV3 } from "./common/dynamodb-client";
import { s3ClientV3 } from "./common/s3-client";

import { randomUUID } from "node:crypto";
import middy from "@middy/core";
import { injectLambdaContext } from "@aws-lambda-powertools/logger";
import { captureLambdaHandler } from "@aws-lambda-powertools/tracer";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const dynamoDBTableFiles = process.env.TABLE_NAME_FILES || "";
const s3BucketFiles = process.env.BUCKET_NAME_FILES || "";

type QueryParams = {
  type: string;
  ext: string;
};

const getPresignedUrl = async (key: string, type: string): Promise<string> => {
  return await getSignedUrl(
    s3ClientV3,
    new PutObjectCommand({
      Bucket: s3BucketFiles,
      Key: key,
      ContentType: type,
    }),
    {
      expiresIn: 3600,
    }
  );
};

const putFileMetadataInTable = async (
  fileId: string,
  key: string,
  type: string,
  transformParams: unknown // TODO: better type
) => {
  await dynamodbClientV3.put({
    TableName: dynamoDBTableFiles,
    Item: {
      id: fileId,
      key,
      status: "created",
      type,
      transformParams,
    },
  });
};

const getObjectKey = (type: string): string => {
  switch (type) {
    case "video/mp4":
    case "video/webm":
    case "image/jpeg":
    case "image/png":
      return type;
    case "application/json":
      return `other`;
    default:
      return "other";
  }
};

export const handler = middy(
  async (
    event: AppSyncResolverEvent<{ input: { type: string } }>
  ): Promise<{ url: string }> => {
    try {
      const fileId = randomUUID();
      const { type: fileType } = event.arguments.input;
      const objectKey = `uploads/${getObjectKey(fileType)}/${fileId}.${
        fileType.split("/")[1]
      }`;

      logger.debug("[GET presigned-url] Object Key", {
        details: objectKey,
      });

      const uploadUrl = await getPresignedUrl(objectKey, fileType);

      logger.debug("[GET presigned-url] Url", {
        details: uploadUrl,
      });

      await putFileMetadataInTable(fileId, objectKey, fileType, {});

      return { url: uploadUrl };
    } catch (err) {
      logger.error("Unable to generate presigned url", err);
      throw err;
    }
  }
)
  .use(captureLambdaHandler(tracer))
  .use(injectLambdaContext(logger, { logEvent: true }));
