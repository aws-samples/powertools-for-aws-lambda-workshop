import { injectLambdaContext } from '@aws-lambda-powertools/logger/middleware';
import { logger, tracer } from '@commons/powertools';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import middy from '@middy/core';
import type { Context, DynamoDBRecord, DynamoDBStreamEvent } from 'aws-lambda';
import type { AttributeValue } from '@aws-sdk/client-dynamodb';
import { captureLambdaHandler } from '@aws-lambda-powertools/tracer/middleware';
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
  // Since we are applying the filter at the DynamoDB Stream level,
  // we know that the record has a NewImage otherwise the record would not be here
  const data = unmarshall(
    record.dynamodb!.NewImage! as Record<string, AttributeValue>
  );
  const { id: fileId, userId, transformedFileKey } = data;

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
        apiUrl: JSON.parse(apiUrlHost).url,
        apiKey: await getSecret(apiKeySecretName),
      });

      return;
    }

    throw error;
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
