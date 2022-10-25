import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocument } from "@aws-sdk/lib-dynamodb";
import { tracer } from "./powertools";

const dynamodbClientV3 = DynamoDBDocument.from(
  new DynamoDBClient({
    apiVersion: "2012-08-10",
    region: process.env.AWS_REGION || "eu-central-1",
  })
);
tracer.captureAWSv3Client(dynamodbClientV3);

export { dynamodbClientV3 };
