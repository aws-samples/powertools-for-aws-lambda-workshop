import { injectLambdaContext } from '@aws-lambda-powertools/logger/middleware';
import { logger } from '@commons/powertools';
import middy from '@middy/core';
import type { APIGatewayProxyEvent } from 'aws-lambda';

export const handler = middy(
  async (
    _event: APIGatewayProxyEvent
  ): Promise<{ statusCode: number; body: string }> => {
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Hello from module 3',
      }),
    };
  }
).use(injectLambdaContext(logger, { logEvent: true }));
