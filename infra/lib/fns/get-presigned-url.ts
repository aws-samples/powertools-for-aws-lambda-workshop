import type { APIGatewayEvent } from "aws-lambda";
import { s3ClientV3, dynamodbClientV3, logger, tracer } from "./common";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "node:crypto";

import middy from "@middy/core";
import { injectLambdaContext } from "@aws-lambda-powertools/logger";
import { captureLambdaHandler } from "@aws-lambda-powertools/tracer";

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

const lambdaHandler = async (event: APIGatewayEvent): Promise<string> => {
  const fileId = randomUUID();
  const objectKey = `uploads/${fileId}`;
  const { type: fileType } = event.queryStringParameters as QueryParams;
  const uploadUrl = await getPresignedUrl(objectKey, fileType);

  logger.debug("[GET presigned-url] Url", {
    details: uploadUrl,
  });

  await putFileMetadataInTable(fileId, objectKey, fileType);

  return JSON.stringify({ data: uploadUrl });
};

const handler = middy(lambdaHandler)
  .use(captureLambdaHandler(tracer))
  .use(injectLambdaContext(logger, { logEvent: true }));

export { handler };
