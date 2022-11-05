import type { EventBridgeEvent } from "aws-lambda";
import { appSyncIamClient } from "./common/appsync-iam-client";
import { generatePresignedUrl } from "./common/graphql/mutations";
import { logger, metrics, tracer } from "./common/powertools";
import type { FileStatus } from "./common/types/File";
import type { Detail, DetailType } from "./common/types/FileUploadEvent";

import { injectLambdaContext } from "@aws-lambda-powertools/logger";
import { logMetrics, MetricUnits } from "@aws-lambda-powertools/metrics";
import { captureLambdaHandler } from "@aws-lambda-powertools/tracer";
import middy from "@middy/core";

const markFileAs = async (fileId: string, status: FileStatus) => {
  const graphQLOperation = {
    query: generatePresignedUrl,
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

  await markFileAs(fileId, "queued");

  logger.debug("Marked File as queued", {
    details: fileId,
  });
  metrics.addMetric("filesUploaded", MetricUnits.Count, 1);
};

const handler = middy(lambdaHandler)
  .use(captureLambdaHandler(tracer))
  .use(injectLambdaContext(logger, { logEvent: true }))
  .use(logMetrics(metrics));

export { handler };
