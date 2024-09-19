import { randomUUID } from 'node:crypto';
import { injectLambdaContext } from '@aws-lambda-powertools/logger/middleware';
import { captureLambdaHandler } from '@aws-lambda-powertools/tracer/middleware';
import { requestResponseMetric } from '@middlewares/requestResponseMetric';
import middy from '@middy/core';
import { logger as loggerMain, metrics, tracer } from '@powertools';
import type { AppSyncIdentityCognito, AppSyncResolverEvent } from 'aws-lambda';
import type {
  GeneratePresignedUploadUrlMutationVariables,
  PresignedUrl,
} from '../../types/API.js';
import { getPresignedUploadUrl, storeFileMetadata } from './utils.js';

const tableName = process.env.TABLE_NAME_FILES || '';
const s3BucketFiles = process.env.BUCKET_NAME_FILES || '';
const logger = loggerMain.createChild({
  persistentLogAttributes: {
    path: 'get-presigned-upload-url',
  },
});

const getObjectKey = (type: string): string => {
  switch (type) {
    case 'image/jpeg':
      return 'images/jpg';
    case 'image/png':
      return 'images/png';
    default:
      return 'other';
  }
};

export const handler = middy(
  async (
    event: AppSyncResolverEvent<GeneratePresignedUploadUrlMutationVariables>
  ): Promise<Partial<PresignedUrl>> => {
    try {
      const fileId = randomUUID();
      if (!event.arguments.input) {
        throw new Error('Invalid input');
      }
      const { type: fileType } = event.arguments.input;

      const { username: userId } = event.identity as AppSyncIdentityCognito;
      const fileTypePrefix = getObjectKey(fileType);
      const fileExtension = fileType.split('/')[1];
      const objectKey = [
        'uploads',
        fileTypePrefix,
        `${fileId}.${fileExtension}`,
      ].join('/');

      const uploadUrl = await getPresignedUploadUrl({
        key: objectKey,
        bucketName: s3BucketFiles,
        type: fileType,
        metadata: {
          fileId,
          userId,
        },
      });

      logger.info('File', {
        details: { url: uploadUrl, id: fileId },
      });

      const response = await storeFileMetadata({
        id: fileId,
        userId,
        key: objectKey,
        type: fileType,
        dynamodb: {
          tableName,
        },
      });

      logger.debug('[GET presigned-url] DynamoDB response', {
        details: response,
      });

      return { url: uploadUrl, id: fileId };
    } catch (err) {
      logger.error('unable to generate presigned url', err as Error);
      throw err;
    }
  }
)
  .use(captureLambdaHandler(tracer))
  .use(
    requestResponseMetric(metrics, {
      graphqlOperation: 'GeneratePresignedUploadUrlMutation',
    })
  )
  .use(injectLambdaContext(logger, { logEvent: true }));
