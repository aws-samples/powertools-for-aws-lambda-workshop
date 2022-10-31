import type { EventBridgeEvent } from "aws-lambda";
import type { Detail, DetailType } from "./common/types/FileUploadEvent";
import { dynamodbClientV3 } from "./common/dynamodb-client";
import { logger, tracer, metrics } from "./common/powertools";

import middy from "@middy/core";
import { injectLambdaContext } from "@aws-lambda-powertools/logger";
import { captureLambdaHandler } from "@aws-lambda-powertools/tracer";
import { logMetrics, MetricUnits } from "@aws-lambda-powertools/metrics";

const dynamoDBTableFiles = process.env.TABLE_NAME_FILES || "";

const markFileAsUploaded = async (fileId: string) => {
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
  logger.debug(key);
  const file = key.split("/").at(-1)!;
  const fileId = file.split(".")[0];
  logger.debug(fileId);

  await markFileAsUploaded(fileId);

  logger.debug("Marked File as uploaded", {
    details: fileId,
  });
  metrics.addMetric("filesUploaded", MetricUnits.Count, 1);
};

const handler = middy(lambdaHandler)
  .use(captureLambdaHandler(tracer))
  .use(injectLambdaContext(logger, { logEvent: true }))
  .use(logMetrics(metrics));

export { handler };
