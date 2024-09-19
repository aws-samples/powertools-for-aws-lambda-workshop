import { injectLambdaContext } from '@aws-lambda-powertools/logger/middleware';
import { logger } from '@commons/powertools';
import middy from '@middy/core';

export const handler = middy(async (_event) => {}).use(
  injectLambdaContext(logger, { logEvent: true })
);
