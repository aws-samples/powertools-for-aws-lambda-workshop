import { injectLambdaContext } from '@aws-lambda-powertools/logger/middleware';
import { MetricUnit } from '@aws-lambda-powertools/metrics';
import { logMetrics } from '@aws-lambda-powertools/metrics/middleware';
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
  const fileName = objectKey.split('/').at(-1);
  if (!fileName) {
    throw new Error('Invalid file name');
  }
  const fileId = fileName.split('.')[0];

  await markFileAs(fileId, FileStatus.QUEUED);

  logger.debug('Marked File as queued', {
    details: fileId,
  });
  metrics.addMetric('FilesQueued', MetricUnit.Count, 1);
};

const handler = middy(lambdaHandler)
  .use(captureLambdaHandler(tracer))
  .use(injectLambdaContext(logger, { logEvent: true }))
  .use(logMetrics(metrics));

export { handler };
