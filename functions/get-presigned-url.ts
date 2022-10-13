import type { APIGatewayEvent } from "aws-lambda";
import { dynamodbClientV3 } from "./common/dynamodb-client";
import { s3ClientV3 } from "./common/s3-client";

import { randomUUID } from "node:crypto";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const dynamoDBTableFiles = process.env.TABLE_NAME_FILES || "";
const s3BucketFiles = process.env.BUCKET_NAME_FILES || "";

type QueryParams = {
  type: string;
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
  type: string
) => {
  await dynamodbClientV3.put({
    TableName: dynamoDBTableFiles,
    Item: {
      id: fileId,
      key,
      uploaded: false,
      type,
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

const lambdaHandler = async (event: APIGatewayEvent): Promise<string> => {
  const fileId = randomUUID();
  const { type: fileType } = event.queryStringParameters as QueryParams;
  const objectKey = `uploads/${getObjectKey(fileType)}/${fileId}`;

  const uploadUrl = await getPresignedUrl(objectKey, fileType);

  await putFileMetadataInTable(fileId, objectKey, fileType);

  return JSON.stringify({ data: uploadUrl });
};

const handler = lambdaHandler;

export { handler };
