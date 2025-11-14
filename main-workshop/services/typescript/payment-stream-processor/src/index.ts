import {
  BatchProcessor,
  EventType,
  processPartialResponse,
} from '@aws-lambda-powertools/batch';
import { Logger } from '@aws-lambda-powertools/logger';
import { injectLambdaContext } from '@aws-lambda-powertools/logger/middleware';
import { Metrics, MetricUnit } from '@aws-lambda-powertools/metrics';
import { logMetrics } from '@aws-lambda-powertools/metrics/middleware';
import { Tracer } from '@aws-lambda-powertools/tracer';
import { captureLambdaHandler } from '@aws-lambda-powertools/tracer/middleware';
import middy from '@middy/core';
import type { Context, DynamoDBRecord, DynamoDBStreamEvent } from 'aws-lambda';
import { StreamProcessorService } from './services/StreamProcessorService';

const logger = new Logger();
const tracer = new Tracer();
const metrics = new Metrics();
const processor = new BatchProcessor(EventType.DynamoDBStreams);

const streamProcessorService = new StreamProcessorService();


const getPaymentStreamEvent = async (record: DynamoDBRecord) => {
  const segment = tracer.getSegment();
  const subsegment = segment?.addNewSubsegment('getPaymentStreamEvent');

  try {
    metrics.addMetric('ExtractedRecords', MetricUnit.Count, 1);
    const result = await streamProcessorService.extractRecord(record);
    subsegment?.close();
    return result;
  } catch (error) {
    subsegment?.close(error as Error);
    throw error;
  }
};

const recordHandler = async (record: DynamoDBRecord) => {
  const extractedData = await getPaymentStreamEvent(record);

  await streamProcessorService.processSingleRecordAsync(extractedData);

  logger.info('RECORD PROCESSED', {
    payment_id: extractedData.paymentId,
    ride_id: extractedData.rideId,
  });
};

const lambdaHandler = async (
  event: DynamoDBStreamEvent,
  context: Context
): Promise<void> => {
  const result = await processPartialResponse(event, recordHandler, processor, {
    context,
    processInParallel: false
  });

  const batchSize = event.Records.length;
  const failureCount = result.batchItemFailures.length;
  const successCount = batchSize - failureCount;

  metrics.addMetric('BatchSize', MetricUnit.Count, batchSize);
  metrics.addMetric('SuccessfulRecords', MetricUnit.Count, successCount);
  metrics.addMetric('FailedRecords', MetricUnit.Count, failureCount);

  logger.info(
    `BATCH COMPLETE: ${successCount} success | ${failureCount} failed of ${batchSize}`
  );
};

export const handler = middy(lambdaHandler)
  .use(captureLambdaHandler(tracer))
  .use(injectLambdaContext(logger))
  .use(logMetrics(metrics));