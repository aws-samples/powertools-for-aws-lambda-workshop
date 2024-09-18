import { injectLambdaContext } from '@aws-lambda-powertools/logger/middleware';
import { captureLambdaHandler } from '@aws-lambda-powertools/tracer/middleware';
import { requestResponseMetric } from '@middlewares/requestResponseMetric';
import middy from '@middy/core';
import { logger as loggerMain, metrics, tracer } from '@powertools';
import type { AppSyncIdentityCognito, AppSyncResolverEvent } from 'aws-lambda';
import type {
  GeneratePresignedDownloadUrlQueryVariables,
  PresignedUrl,
} from '../../types/API.js';
import { getFileIdFromStore, getPresignedDownloadUrl } from './utils.js';

const tableName = process.env.TABLE_NAME_FILES || '';
const indexName = process.env.INDEX_NAME_FILES_BY_USER || '';
const s3BucketFiles = process.env.BUCKET_NAME_FILES || '';
const logger = loggerMain.createChild({
  persistentLogAttributes: {
    path: 'get-presigned-download-url',
  },
});

export const handler = middy(
  async (
    event: AppSyncResolverEvent<GeneratePresignedDownloadUrlQueryVariables>
  ): Promise<Partial<PresignedUrl>> => {
    try {
      const { id: fileId } = event.arguments;
      if (!fileId) throw new Error('File id not provided.');
      const { username: userId } = event.identity as AppSyncIdentityCognito;

      const transformedFileKey = await getFileIdFromStore({
        fileId,
        userId,
        dynamodb: {
          tableName,
          indexName,
        },
      });
      const downloadUrl = await getPresignedDownloadUrl({
        objectKey: transformedFileKey,
        bucketName: s3BucketFiles,
      });

      logger.debug('file requested for download', {
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
