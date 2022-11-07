import type { AppSyncIdentityCognito, AppSyncResolverEvent } from "aws-lambda";
import { logger, tracer } from "./common/powertools";
import { dynamodbClientV3 } from "./common/dynamodb-client";
import { s3ClientV3 } from "./common/s3-client";

import middy from "@middy/core";
import { injectLambdaContext } from "@aws-lambda-powertools/logger";
import { captureLambdaHandler } from "@aws-lambda-powertools/tracer";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import {
  GeneratePresignedDownloadUrlQueryVariables,
  PresignedUrl,
} from "./common/types/API";

const dynamoDBTableFiles = process.env.TABLE_NAME_FILES || "";
const indexFilesByUser = process.env.INDEX_NAME_FILES_BY_USER || "";
const s3BucketFiles = process.env.BUCKET_NAME_FILES || "";

const getPresignedUrl = async (key: string): Promise<string> => {
  return await getSignedUrl(
    s3ClientV3,
    new GetObjectCommand({
      Bucket: s3BucketFiles,
      Key: key,
    }),
    {
      expiresIn: 3600,
    }
  );
};

const getFileKey = async (fileId: string, userId: string) => {
  const res = await dynamodbClientV3.query({
    TableName: dynamoDBTableFiles,
    IndexName: indexFilesByUser,
    KeyConditionExpression: "#id = :id AND #userId = :userId",
    FilterExpression: "#status = :status",
    ExpressionAttributeNames: {
      "#status": "status",
      "#id": "id",
      "#userId": "userId",
    },
    ExpressionAttributeValues: {
      ":status": "completed",
      ":id": fileId,
      ":userId": userId,
    },
  });
  if (!res.Items || res.Items.length === 0)
    throw new Error("Unable to find object");
  return res.Items[0].key;
};

export const handler = middy(
  async (
    event: AppSyncResolverEvent<GeneratePresignedDownloadUrlQueryVariables>
  ): Promise<Partial<PresignedUrl>> => {
    try {
      const { id: fileId } = event.arguments!;
      if (!fileId) throw new Error("File id not provided.");
      const { username: userId } = event.identity as AppSyncIdentityCognito;

      const objectKey = await getFileKey(fileId, userId);
      const transformedObjectKey = objectKey
        .replace("uploads", "transformed")
        .replace(/jpeg|png/g, "webp")
        .replace(/mp4/g, "webm");
      const downloadUrl = await getPresignedUrl(transformedObjectKey);

      logger.debug("[GET presigned-url] File", {
        details: { url: downloadUrl, id: fileId },
      });

      return { url: downloadUrl, id: fileId };
    } catch (err) {
      logger.error("Unable to generate presigned url", err);
      throw err;
    }
  }
)
  .use(captureLambdaHandler(tracer))
  .use(injectLambdaContext(logger, { logEvent: true }));
