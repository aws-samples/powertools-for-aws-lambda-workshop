import { injectLambdaContext } from '@aws-lambda-powertools/logger';
import { logMetrics, MetricUnits } from '@aws-lambda-powertools/metrics';
import { captureLambdaHandler } from '@aws-lambda-powertools/tracer';
import middy from '@middy/core';
import type { EventBridgeEvent } from 'aws-lambda';

import { FileStatuses, markFileAs } from './common/appsync-iam-client';
import { logger, metrics, tracer } from './common/powertools';
import { getFileId } from './common/processing-utils';
import type { Detail, DetailType } from './common/types/FileUploadEvent';

const lambdaHandler = async (
  event: EventBridgeEvent<DetailType, Detail>
): Promise<void> => {
  const {
    object: { key: objectKey },
  } = event.detail;
  const fileId = getFileId(objectKey);

  await markFileAs(fileId, FileStatuses.QUEUED);

  logger.debug('Marked File as queued', {
    details: fileId,
  });
  metrics.addMetric('filesUploaded', MetricUnits.Count, 1);
};

const handler = middy(lambdaHandler)
  .use(captureLambdaHandler(tracer))
  .use(injectLambdaContext(logger, { logEvent: true }))
  .use(logMetrics(metrics));

export { handler };
