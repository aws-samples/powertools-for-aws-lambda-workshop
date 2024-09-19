import type middy from '@middy/core';

import type { MiddyLikeRequest } from '@aws-lambda-powertools/commons/types';
import type { Metrics } from '@aws-lambda-powertools/metrics';
import { MetricUnit } from '@aws-lambda-powertools/metrics';

interface Options {
  graphqlOperation: string;
}

const requestResponseMetric = (
  metrics: Metrics,
  options: Options
): middy.MiddlewareObj => {
  const requestHandler = (request: MiddyLikeRequest): void => {
    request.internal = {
      ...request.internal,
      powertools: {
        ...(request.internal.powertools || {}),
        startTime: Date.now(),
      },
    };
  };

  const addTimeElapsedMetric = (startTime: number): void => {
    const timeElapsed = Date.now() - startTime;
    metrics.addMetric('latencyInMs', MetricUnit.Milliseconds, timeElapsed);
  };

  const addOperation = (): void => {
    metrics.addDimension('graphqlOperation', options.graphqlOperation);
  };

  const responseHandler = (request: middy.Request): void => {
    metrics.addDimension('httpResponseCode', '200');
    const { event, internal } = request;
    metrics.addDimension(
      'consumerCountryCode',
      event.request.headers['cloudfront-viewer-country'].toString() || 'N/A'
    );
    addTimeElapsedMetric(internal.powertools.startTime);
    addOperation();
    metrics.publishStoredMetrics();
  };

  const responseErrorHandler = (request: middy.Request): void => {
    const { internal } = request;
    metrics.addDimension('httpResponseCode', '500');
    addTimeElapsedMetric(internal.powertools.startTime);
    addOperation();
    metrics.publishStoredMetrics();
  };

  return {
    before: requestHandler,
    after: responseHandler,
    onError: responseErrorHandler,
  };
};

export { requestResponseMetric };
