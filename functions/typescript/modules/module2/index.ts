import { injectLambdaContext } from '@aws-lambda-powertools/logger';
import { logger, tracer } from '@commons/powertools';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import middy from '@middy/core';
import type { Context, DynamoDBRecord, DynamoDBStreamEvent } from 'aws-lambda';
import type { AttributeValue } from '@aws-sdk/client-dynamodb';
import { captureLambdaHandler } from '@aws-lambda-powertools/tracer';
import { getLabels, reportImageIssue } from './utils';
import { NoLabelsFoundError, NoPersonFoundError } from './errors';
import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from '@aws-sdk/client-secrets-manager';

const s3BucketFiles = process.env.BUCKET_NAME_FILES || '';
const apiUrlHost = process.env.API_URL_HOST || '';
const apiKeySecretName = process.env.API_KEY_SECRET_NAME || '';

const secretsClient = new SecretsManagerClient({});

const getSecret = async (secretName: string): Promise<string | undefined> => {
  const command = new GetSecretValueCommand({
    SecretId: secretName,
  });
  const response = await secretsClient.send(command);
  const secret = response.SecretString;
  if (!secret) {
    throw new Error(`Unable to get secret ${secretName}`);
  }

  return secret;
};

const recordHandler = async (record: DynamoDBRecord): Promise<void> => {
  // Create a segment to trace the execution of the function and add the file id and user id as annotations
  const recordSegment = tracer
    .getSegment()
    ?.addNewSubsegment('### recordHandler');
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
  // Add the file id and user id as annotations to the segment so that we can correlate the logs with the traces
  recordSegment?.addAnnotation('fileId', fileId);
  recordSegment?.addAnnotation('userId', userId);

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
        apiUrl: JSON.parse(apiUrlHost).url,
        apiKey: await getSecret(apiKeySecretName),
      });

      return;
    }

    throw error;
  } finally {
    // Remove the file id and user id from the logger
    logger.removeKeys(['fileId', 'userId']);
    // Close the segment
    recordSegment?.close();
  }
};

export const handler = middy(
  async (event: DynamoDBStreamEvent, _context: Context): Promise<void> => {
    const records = event.Records;

    for (const record of records) {
      await recordHandler(record);
    }
  }
)
  .use(captureLambdaHandler(tracer))
  .use(injectLambdaContext(logger, { logEvent: true }));
