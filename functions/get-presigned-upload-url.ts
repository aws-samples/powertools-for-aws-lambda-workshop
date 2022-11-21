import type {
  AppSyncIdentityCognito,
  AppSyncResolverEvent,
  Context,
} from 'aws-lambda';
import middy from '@middy/core';
import { logger, tracer, metrics } from './common/powertools';
import { dynamodbClientV3 } from './common/dynamodb-client';
import { requestResponseMetric } from './common/middleware/requestResponseMetric';
import { faultInjection } from './common/middleware/faultInjection';
// const failureLambda = require("failure-lambda");

import { LambdaInterface } from '@aws-lambda-powertools/commons';
import { randomUUID } from 'node:crypto';

import {
  GeneratePresignedUploadUrlMutationVariables,
  PresignedUrl,
} from './common/types/API';
import { getPresignedUploadUrl } from './common/presigned-url-utils';
import { captureLambdaHandler } from '@aws-lambda-powertools/tracer';
import { injectLambdaContext } from '@aws-lambda-powertools/logger';

const dynamoDBTableFiles = process.env.TABLE_NAME_FILES || '';
const s3BucketFiles = process.env.BUCKET_NAME_FILES || '';

const getObjectKey = (type: string): string => {
  switch (type) {
    case 'video/mp4':
    case 'video/webm':
    case 'image/jpeg':
    case 'image/png':
      return type;
    case 'application/json':
      return `other`;
    default:
      return 'other';
  }
};

const putFileMetadataInTable = async (
  fileId: string,
  key: string,
  type: string,
  userId: string,
  transformParams?: string
) => await dynamodbClientV3.put({
  TableName: dynamoDBTableFiles,
  Item: {
    id: fileId,
    key,
    status: 'created',
    type,
    transformParams,
    userId,
  },
});

export const handler = middy(
  async (
    event: AppSyncResolverEvent<GeneratePresignedUploadUrlMutationVariables>,
    _context: Context
  ): Promise<Partial<PresignedUrl>> => {
    try {
      const fileId = randomUUID();
      const { type: fileType, transformParams } = event.arguments.input!;
      if (!fileType || !transformParams) {
        throw new Error('File type or transformParams not provided.');
      }

      const { username: userId } = event.identity as AppSyncIdentityCognito;
      const objectKeyValue = await getObjectKey(fileType);
      const objectKey = `uploads/${objectKeyValue}/${fileId}.${
        fileType.split('/')[1]
      }`;

      logger.info('[GET presigned-url] Object Key', {
        details: objectKey,
      });

      const uploadUrl = await getPresignedUploadUrl(
        objectKey,
        s3BucketFiles,
        fileType
      );

      logger.info('[GET presigned-url] File', {
        details: { url: uploadUrl, id: fileId },
      });

      const response = await putFileMetadataInTable(
        fileId,
        objectKey,
        fileType,
        userId,
        transformParams
      );

      logger.info('[GET presigned-url] DynamoDB response', {
        details: response,
      });

      return { url: uploadUrl, id: fileId };
    } catch (err) {
      logger.error('Unable to generate presigned url', err as Error);
      throw err;
    }
  }
)
  .use(captureLambdaHandler(tracer))
  .use(faultInjection({ logger, tracer }))
  .use(
    requestResponseMetric(metrics, {
      graphqlOperation: 'GeneratePresignedUploadUrlMutation',
    })
  )
  .use(injectLambdaContext(logger, { logEvent: true }));
