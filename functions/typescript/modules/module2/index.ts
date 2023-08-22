import { injectLambdaContext } from '@aws-lambda-powertools/logger';
import { logger as loggerMain, tracer } from '@commons/powertools';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import middy from '@middy/core';
import type { DynamoDBRecord, DynamoDBStreamEvent } from 'aws-lambda';
import type { AttributeValue } from '@aws-sdk/client-dynamodb';
import { captureLambdaHandler } from '@aws-lambda-powertools/tracer';
import { getSecret } from '@aws-lambda-powertools/parameters/secrets';
import { getParameter } from '@aws-lambda-powertools/parameters/ssm';
import { Headers, fetch } from 'undici';
import { getLabels } from './utils';

const s3BucketFiles = process.env.BUCKET_NAME_FILES || '';
const apiUrlParameterName = process.env.API_URL_PARAMETER_NAME || '';
const apiKeySecretName = process.env.API_KEY_SECRET_NAME || '';
export const logger = loggerMain.createChild({
  persistentLogAttributes: {
    path: 'module2',
  },
});

const recordHandler = async (record: DynamoDBRecord): Promise<void> => {
  // Since we are applying the filter at the DynamoDB Stream level,
  // we know that the record has a NewImage otherwise the record would not be here
  const data = unmarshall(
    record.dynamodb!.NewImage! as Record<string, AttributeValue>
  );
  const { id: fileId, userId } = data;
  // Add the file id and user id to the logger so that all the logs after this
  // will have these attributes and we can correlate them
  logger.appendKeys({
    fileId,
    userId,
  });

  try {
    // Get the labels from Rekognition
    const labels = await getLabels(s3BucketFiles, fileId, userId);

    // Get the apiUrl and apiKey from SSM and Secrets Manager respectively
    const apiUrl = await getParameter<string>(apiUrlParameterName, {
      maxAge: 900,
    });
    const apiKey = await getSecret<string>(apiKeySecretName, { maxAge: 900 });
    if (!apiUrl || !apiKey) {
      throw new Error(
        `Missing apiUrl or apiKey. apiUrl: ${apiUrl}, apiKey: ${apiKey}`
      );
    }

    logger.debug('Sending labels to the API');

    // Send the labels to the API
    await fetch(apiUrl, {
      method: 'POST',
      headers: new Headers({
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      }),
      body: JSON.stringify({
        fileId,
        userId,
        labels,
      }),
    });

    logger.debug('Labels sent to the API');
  } finally {
    // Remove the file id and user id from the logger
    logger.removeKeys(['fileId', 'userId']);
  }
};

export const handler = middy(
  async (event: DynamoDBStreamEvent): Promise<void> => {
    for (const record of event.Records) {
      await recordHandler(record);
    }
  }
)
  .use(captureLambdaHandler(tracer))
  .use(injectLambdaContext(logger));
