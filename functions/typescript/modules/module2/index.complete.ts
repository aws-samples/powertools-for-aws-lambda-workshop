import { injectLambdaContext } from '@aws-lambda-powertools/logger';
import { logger, tracer } from '@commons/powertools';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import middy from '@middy/core';
import type {
  Context,
  DynamoDBBatchResponse,
  DynamoDBRecord,
  DynamoDBStreamEvent,
} from 'aws-lambda';
import type { AttributeValue } from '@aws-sdk/client-dynamodb';
import { captureLambdaHandler } from '@aws-lambda-powertools/tracer';
import {
  BatchProcessor,
  EventType,
  processPartialResponse,
} from '@aws-lambda-powertools/batch';
import { getLabels, reportImageIssue } from './utils';
import { NoLabelsFoundError, NoPersonFoundError } from './errors';
import { getSecret } from '@aws-lambda-powertools/parameters/secrets';
import { getParameter } from '@aws-lambda-powertools/parameters/ssm';

const s3BucketFiles = process.env.BUCKET_NAME_FILES || '';
const apiUrlParameterName = process.env.API_URL_PARAMETER_NAME || '';
const apiKeySecretName = process.env.API_KEY_SECRET_NAME || '';

const processor = new BatchProcessor(EventType.DynamoDBStreams);

const recordHandler = async (record: DynamoDBRecord): Promise<void> => {
  // Since we are applying the filter at the DynamoDB Stream level,
  // we know that the record has a NewImage otherwise the record would not be here
  const data = unmarshall(
    record.dynamodb!.NewImage! as Record<string, AttributeValue>
  );
  const { id: fileId, userId, transformedFileKey } = data;
  // Add the file id and user id to the logger so that all the logs after this
  // will have these attributes and we can correlate them
  logger.appendKeys({
    fileId,
    userId,
  });

  try {
    // Get the labels from Rekognition
    await getLabels(s3BucketFiles, fileId, userId, transformedFileKey);
  } catch (error) {
    // If no person was found in the image, report the issue to the API for further investigation
    if (
      error instanceof NoPersonFoundError ||
      error instanceof NoLabelsFoundError
    ) {
      logger.warn('No person found in the image');
      await reportImageIssue(fileId, userId, {
        apiUrl: await getParameter<string>(apiUrlParameterName, {
          maxAge: 900,
        }),
        apiKey: await getSecret<string>(apiKeySecretName, { maxAge: 900 }),
      });

      return;
    }

    throw error;
  } finally {
    // Remove the file id and user id from the logger
    logger.removeKeys(['fileId', 'userId']);
  }
};

export const handler = middy(
  async (
    event: DynamoDBStreamEvent,
    context: Context
  ): Promise<DynamoDBBatchResponse> => {
    return processPartialResponse(event, recordHandler, processor, {
      context,
    });
  }
)
  .use(captureLambdaHandler(tracer))
  .use(injectLambdaContext(logger, { logEvent: true }));
