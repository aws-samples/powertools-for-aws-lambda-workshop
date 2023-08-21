import { injectLambdaContext } from '@aws-lambda-powertools/logger';
import { captureLambdaHandler } from '@aws-lambda-powertools/tracer';
import { requestResponseMetric } from '@middlewares/requestResponseMetric';
import middy from '@middy/core';
import { logger, metrics, tracer } from '@powertools';
import type { AppSyncIdentityCognito, AppSyncResolverEvent } from 'aws-lambda';
import { randomUUID } from 'node:crypto';
import type {
  GeneratePresignedUploadUrlMutationVariables,
  PresignedUrl,
} from '../../types/API';
import { getPresignedUploadUrl, storeFileMetadata } from './utils';

const tableName = process.env.TABLE_NAME_FILES || '';
const s3BucketFiles = process.env.BUCKET_NAME_FILES || '';

const getObjectKey = (type: string): string => {
  switch (type) {
    case 'image/jpeg':
    case 'image/png':
      return type;
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
      const { type: fileType } = event.arguments.input!;

      const { username: userId } = event.identity as AppSyncIdentityCognito;
      const objectKeyValue = getObjectKey(fileType);
      const objectKey = `uploads/${objectKeyValue}/${fileId}.${
        fileType.split('/')[1]
      }`;

      logger.info('[GET presigned-url] Object Key', {
        details: objectKey,
      });

      const uploadUrl = await getPresignedUploadUrl({
        key: objectKey,
        bucketName: s3BucketFiles,
        type: fileType,
      });

      logger.info('[GET presigned-url] File', {
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
  .use(
    requestResponseMetric(metrics, {
      graphqlOperation: 'GeneratePresignedUploadUrlMutation',
    })
  )
  .use(injectLambdaContext(logger, { logEvent: true }));
