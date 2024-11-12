import {
  BatchProcessor,
  EventType,
  processPartialResponse,
} from '@aws-lambda-powertools/batch';
import { injectLambdaContext } from '@aws-lambda-powertools/logger/middleware';
import { getSecret } from '@aws-lambda-powertools/parameters/secrets';
import { getParameter } from '@aws-lambda-powertools/parameters/ssm';
import { captureLambdaHandler } from '@aws-lambda-powertools/tracer/middleware';
import type { AttributeValue } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import { logger, tracer } from '@commons/powertools';
import middy from '@middy/core';
import type {
  Context,
  DynamoDBBatchResponse,
  DynamoDBRecord,
  DynamoDBStreamEvent,
} from 'aws-lambda';
import { NoLabelsFoundError, NoPersonFoundError } from './errors';
import { getLabels, reportImageIssue } from './utils';

const s3BucketFiles = process.env.BUCKET_NAME_FILES || '';
const apiUrlParameterName = process.env.API_URL_PARAMETER_NAME || '';
const apiKeySecretName = process.env.API_KEY_SECRET_NAME || '';

const processor = new BatchProcessor(EventType.DynamoDBStreams);

const recordHandler = async (
  record: DynamoDBRecord,
  lambdaContext: Context
): Promise<void> => {
  if (lambdaContext.getRemainingTimeInMillis() < 1000) {
    logger.warn(
      'Invocation is about to time out, marking all remaining records as failed',
      {
        fileId: record.dynamodb?.NewImage?.id.S,
        userId: record.dynamodb?.NewImage?.userId.S,
      }
    );
    throw new Error(
      'Time remaining <1s, marking record as failed to retry later'
    );
  }
  // Create a segment to trace the execution of the function and add the file id and user id as annotations
  const recordSegment = tracer
    .getSegment()
    ?.addNewSubsegment('### recordHandler');
  recordSegment && tracer.setSegment(recordSegment);
  // Since we are applying the filter at the DynamoDB Stream level,
  // we know that the record has a NewImage otherwise the record would not be here
  const data = unmarshall(
    record.dynamodb?.NewImage as Record<string, AttributeValue>
  );
  const { id: fileId, userId, transformedFileKey } = data;
  // Add the file id and user id to the logger so that all the logs after this
  // will have these attributes and we can correlate them
  logger.appendKeys({
    fileId,
    userId,
  });
  // Add the file id and user id as annotations to the segment so that we can correlate the logs with the traces
  tracer.putAnnotation('fileId', fileId);
  tracer.putAnnotation('userId', userId);

  try {
    // Get the labels from Rekognition
    await getLabels(s3BucketFiles, fileId, userId, transformedFileKey);
  } catch (error) {
    // If no person was found in the image, report the issue to the API for further investigation
    if (
      error instanceof NoPersonFoundError ||
      error instanceof NoLabelsFoundError
    ) {
      await reportImageIssue(fileId, userId, {
        apiUrl: (
          await getParameter<{ url: string }>(apiUrlParameterName, {
            transform: 'json',
            maxAge: 900,
          })
        )?.url,
        apiKey: await getSecret<string>(apiKeySecretName, { maxAge: 900 }),
      });

      return;
    }

    throw error;
  } finally {
    // Remove the file id and user id from the logger
    logger.removeKeys(['fileId', 'userId']);
    // Close & restore the segment
    recordSegment?.close();
    recordSegment && tracer.setSegment(recordSegment.parent);
  }
};

export const handler = middy(
  async (
    event: DynamoDBStreamEvent,
    context: Context
  ): Promise<DynamoDBBatchResponse> => {
    return processPartialResponse(event, recordHandler, processor, {
      context,
      processInParallel: false,
    });
  }
)
  .use(captureLambdaHandler(tracer))
  .use(injectLambdaContext(logger, { logEvent: true }));
