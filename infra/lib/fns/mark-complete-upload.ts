import type { S3ObjectCreatedNotificationEvent } from "aws-lambda";
import { dynamodbClientV3, logger, tracer } from "./common";

import middy from "@middy/core";
import { injectLambdaContext } from "@aws-lambda-powertools/logger";
import { captureLambdaHandler } from "@aws-lambda-powertools/tracer";

const dynamoDBTableFiles = process.env.TABLE_NAME_FILES || "";

const putFileMetadataInTable = async (fileId: string) => {
  await dynamodbClientV3.update({
    TableName: dynamoDBTableFiles,
    Key: {
      id: fileId,
    },
    UpdateExpression: "set #uploaded = :val",
    ExpressionAttributeNames: {
      "#uploaded": "uploaded",
    },
    ExpressionAttributeValues: {
      ":val": true,
    },
  });
};

const lambdaHandler = async (
  event: S3ObjectCreatedNotificationEvent
): Promise<void> => {};

const handler = middy(lambdaHandler)
  .use(captureLambdaHandler(tracer))
  .use(injectLambdaContext(logger, { logEvent: true }));

export { handler };
