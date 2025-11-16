import { Logger } from '@aws-lambda-powertools/logger';
import { injectLambdaContext } from '@aws-lambda-powertools/logger/middleware';
import {
  MetricResolution,
  Metrics,
  MetricUnit,
} from '@aws-lambda-powertools/metrics';
import { logMetrics } from '@aws-lambda-powertools/metrics/middleware';
import { Tracer } from '@aws-lambda-powertools/tracer';
import { captureLambdaHandler } from '@aws-lambda-powertools/tracer/middleware';
import middy from '@middy/core';
import type { Context, DynamoDBStreamEvent } from 'aws-lambda';
import { StreamProcessorService } from './services/StreamProcessorService';

const logger = new Logger();
const tracer = new Tracer();
const metrics = new Metrics();

const streamProcessorService = new StreamProcessorService();

const lambdaHandler = async (
  event: DynamoDBStreamEvent,
  context: Context
): Promise<void> => {
  let successCount = 0;
  let failureCount = 0;
  const totalCount = event.Records.length;

  try {
    for (const record of event.Records) {
      try {
        metrics.addMetric('ExtractedRecords', MetricUnit.Count, 1);

        const extractedData =
          await streamProcessorService.extractRecord(record);

        // Add correlation ID to logger context for tracking
        if (extractedData.correlationId) {
          logger.appendKeys({
            correlation_id: extractedData.correlationId,
          });
        }

        await streamProcessorService.processSingleRecordAsync(extractedData);

        logger.info('RECORD PROCESSED', {
          payment_id: extractedData.paymentId,
          ride_id: extractedData.rideId,
        });

        successCount++;
      } catch (error) {
        failureCount++;
        logger.error('RECORD FAILED - entire batch will be retried', {
          error,
          success_count: successCount,
          failure_count: failureCount,
          exc_info: true,
        });
        // Re-raise to fail the entire batch
        throw error;
      }
    }
    logger.info('BATCH COMPLETE', {
      success_count: successCount,
      failure_count: failureCount,
      total_records: totalCount,
    });
  } finally {
    metrics.addMetric(
      'BatchSize',
      MetricUnit.Count,
      totalCount,
      MetricResolution.High
    );
    metrics.addMetric(
      'SuccessfulRecords',
      MetricUnit.Count,
      successCount,
      MetricResolution.High
    );
    metrics.addMetric(
      'FailedRecords',
      MetricUnit.Count,
      failureCount,
      MetricResolution.High
    );
  }
};

export const handler = middy(lambdaHandler)
  .use(captureLambdaHandler(tracer))
  .use(injectLambdaContext(logger))
  .use(logMetrics(metrics));
