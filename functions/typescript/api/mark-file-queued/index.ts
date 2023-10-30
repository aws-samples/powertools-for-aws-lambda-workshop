import { injectLambdaContext } from '@aws-lambda-powertools/logger/middleware';
import { logMetrics } from '@aws-lambda-powertools/metrics/middleware';
import { MetricUnit } from '@aws-lambda-powertools/metrics';
import { captureLambdaHandler } from '@aws-lambda-powertools/tracer/middleware';
import { FileStatus } from '@constants';
import middy from '@middy/core';
import { logger as loggerMain, metrics, tracer } from '@powertools';
import type { EventBridgeEvent } from 'aws-lambda';
import type { Detail, DetailType } from './types';
import { markFileAs } from './utils';

const logger = loggerMain.createChild({
  persistentLogAttributes: {
    path: 'mark-file-queued',
  },
});

const lambdaHandler = async (
  event: EventBridgeEvent<DetailType, Detail>
): Promise<void> => {
  const {
    object: { key: objectKey },
  } = event.detail;
  const fileId = objectKey.split('/').at(-1)!.split('.')[0];

  await markFileAs(fileId, FileStatus.QUEUED);

  logger.debug('Marked File as queued', {
    details: fileId,
  });
  metrics.addMetric('filesUploaded', MetricUnit.Count, 1);
};

const handler = middy(lambdaHandler)
  .use(captureLambdaHandler(tracer))
  .use(injectLambdaContext(logger, { logEvent: true }))
  .use(logMetrics(metrics));

export { handler };
