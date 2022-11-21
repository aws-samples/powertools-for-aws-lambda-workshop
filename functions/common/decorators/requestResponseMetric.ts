import type { Metrics } from '@aws-lambda-powertools/metrics';
import { MetricUnits } from '@aws-lambda-powertools/metrics';

interface Options {
  graphqlOperation: string
}

function requestResponseMetric(metrics: Metrics, options: Options) {
  return (
    _target: unknown,
    _propertyKey: string,
    descriptor: PropertyDescriptor
  ) => {
    const originalMethod = descriptor.value!;
    descriptor.value = function (...args: unknown[]) {
      const startTime = Date.now();
      try {
        const response = originalMethod.apply(this, [...args]);
        metrics.addDimension('httpResponseCode', '200');
        
        return response;
      } catch (err) {
        metrics.addDimension('httpResponseCode', '500');
        throw err;
      } finally {
        metrics.addDimension('graphqlOperation', options.graphqlOperation);
        const timeElapsed = Date.now() - startTime;
        metrics.addMetric('latencyInMs', MetricUnits.Milliseconds, timeElapsed);
        metrics.publishStoredMetrics();
      }
    };
  };
}

export { requestResponseMetric };
