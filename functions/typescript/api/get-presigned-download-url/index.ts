import { requestResponseMetric } from '@middlewares/requestResponseMetric';
import { logger, metrics, tracer } from '@powertools';
import type { AppSyncIdentityCognito, AppSyncResolverEvent } from 'aws-lambda';
import { injectLambdaContext } from '@aws-lambda-powertools/logger';
import { captureLambdaHandler } from '@aws-lambda-powertools/tracer';
import middy from '@middy/core';
import { getPresignedDownloadUrl, getFileKey } from './utils';
import {
  GeneratePresignedDownloadUrlQueryVariables,
  PresignedUrl,
} from '../../types/API';

const tableName = process.env.TABLE_NAME_FILES || '';
const indexName = process.env.INDEX_NAME_FILES_BY_USER || '';
const s3BucketFiles = process.env.BUCKET_NAME_FILES || '';

export const handler = middy(
  async (
    event: AppSyncResolverEvent<GeneratePresignedDownloadUrlQueryVariables>
  ): Promise<Partial<PresignedUrl>> => {
    try {
      const { id: fileId } = event.arguments!;
      if (!fileId) throw new Error('File id not provided.');
      const { username: userId } = event.identity as AppSyncIdentityCognito;

      const objectKey = await getFileKey({
        fileId,
        userId,
        dynamodb: {
          tableName,
          indexName,
        },
      });
      const transformedObjectKey = objectKey
        .replace('uploads', 'transformed')
        .replace(/jpeg|png/g, 'webp');
      const downloadUrl = await getPresignedDownloadUrl({
        objectKey: transformedObjectKey,
        bucketName: s3BucketFiles,
      });

      logger.debug('[GET presigned-url] File', {
        details: { url: downloadUrl, id: fileId },
      });

      return { url: downloadUrl, id: fileId };
    } catch (err) {
      logger.error('Unable to generate presigned url', err as Error);
      throw err;
    }
  }
)
  .use(captureLambdaHandler(tracer))
  .use(
    requestResponseMetric(metrics, {
      graphqlOperation: 'GeneratePresignedDownloadUrlQuery',
    })
  )
  .use(injectLambdaContext(logger, { logEvent: true }));
