import type { EventBridgeEvent } from "aws-lambda";
import type { Detail, DetailType } from "./common/types/FileUploadEvent";
import { dynamodbClientV3 } from "./common/dynamodb-client";

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
  event: EventBridgeEvent<DetailType, Detail>
): Promise<void> => {
  const {
    object: { key },
  } = event.detail;

  if (!key.includes("/")) return;
  const fileId = key.split("/").at(-1) as string;

  await putFileMetadataInTable(fileId);
};

const handler = lambdaHandler;

export { handler };
