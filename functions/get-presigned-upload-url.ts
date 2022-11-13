import type { AppSyncIdentityCognito, AppSyncResolverEvent } from "aws-lambda";
import { logger, tracer } from "./common/powertools";
import { dynamodbClientV3 } from "./common/dynamodb-client";

import { randomUUID } from "node:crypto";
import middy from "@middy/core";
import { injectLambdaContext } from "@aws-lambda-powertools/logger";
import { captureLambdaHandler } from "@aws-lambda-powertools/tracer";
import {
  GeneratePresignedUploadUrlMutationVariables,
  PresignedUrl,
} from "./common/types/API";
import { getPresignedUploadUrl } from "./common/presigned-url-utils";

const dynamoDBTableFiles = process.env.TABLE_NAME_FILES || "";
const s3BucketFiles = process.env.BUCKET_NAME_FILES || "";

const putFileMetadataInTable = async (
  fileId: string,
  key: string,
  type: string,
  userId: string,
  transformParams?: string
) => {
  await dynamodbClientV3.put({
    TableName: dynamoDBTableFiles,
    Item: {
      id: fileId,
      key,
      status: "created",
      type,
      transformParams,
      userId,
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
    event: AppSyncResolverEvent<GeneratePresignedUploadUrlMutationVariables>
  ): Promise<Partial<PresignedUrl>> => {
    try {
      const fileId = randomUUID();
      const { type: fileType, transformParams } = event.arguments.input!;
      if (!fileType || !transformParams)
        throw new Error("File type or transformParams not provided.");
      const { username: userId } = event.identity as AppSyncIdentityCognito;
      const objectKey = `uploads/${getObjectKey(fileType)}/${fileId}.${
        fileType.split("/")[1]
      }`;

      logger.debug("[GET presigned-url] Object Key", {
        details: objectKey,
      });

      const uploadUrl = await getPresignedUploadUrl(
        objectKey,
        s3BucketFiles,
        fileType
      );

      logger.debug("[GET presigned-url] File", {
        details: { url: uploadUrl, id: fileId },
      });

      await putFileMetadataInTable(
        fileId,
        objectKey,
        fileType,
        userId,
        transformParams
      );

      return { url: uploadUrl, id: fileId };
    } catch (err) {
      logger.error("Unable to generate presigned url", err);
      throw err;
    }
  }
)
  .use(captureLambdaHandler(tracer))
  .use(injectLambdaContext(logger, { logEvent: true }));
