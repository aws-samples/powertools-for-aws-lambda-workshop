import type middy from '@middy/core';
import type { Metrics } from '@aws-lambda-powertools/metrics';
import { MetricUnits } from '@aws-lambda-powertools/metrics';

interface Options {
  graphqlOperation: string
}

const requestResponseMetric = (
  metrics: Metrics,
  options: Options
): middy.MiddlewareObj => {
  let startTime: number;

  const requestHandler = (): void => {
    startTime = Date.now();
  };

  const addTimeElapsedMetric = (): void => {
    const timeElapsed = Date.now() - startTime;
    metrics.addMetric('latencyInMs', MetricUnits.Milliseconds, timeElapsed);
  };

  const addOperation = (): void => {
    metrics.addDimension('graphqlOperation', options.graphqlOperation);
  };

  const responseHandler = (): void => {
    metrics.addDimension('httpResponseCode', '200');
    addTimeElapsedMetric();
    addOperation();
    metrics.publishStoredMetrics();
  };

  const responseErrorHandler = (): void => {
    metrics.addDimension('httpResponseCode', '500');
    addTimeElapsedMetric();
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
