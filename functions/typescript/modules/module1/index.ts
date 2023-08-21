import { injectLambdaContext } from '@aws-lambda-powertools/logger';
import { MetricUnits, logMetrics } from '@aws-lambda-powertools/metrics';
import { captureLambdaHandler } from '@aws-lambda-powertools/tracer';
import { logger, metrics, tracer } from '@commons/powertools';
import { FileStatus, ImageSize, TransformSize } from '@constants';
import middy from '@middy/core';
import type { Context, SQSEvent } from 'aws-lambda';
import {
  TimeoutError,
  createThumbnail,
  extractFileId,
  extractObjectKey,
  getOriginalObject,
  markFileAs,
  timedOutAsyncOperation,
  writeTransformedObjectToS3,
} from './utils';

const s3BucketFiles = process.env.BUCKET_NAME_FILES || '';

const processOne = async (fileId: string, objectKey: string): Promise<void> => {
  const newFileKey = `transformed/image/webp/${fileId}.webp`;
  // Get the original image from S3
  const originalImage = await getOriginalObject(objectKey, s3BucketFiles);
  const transform = TransformSize[ImageSize.SMALL];
  // Create thumbnail from original image
  const processedImage = await createThumbnail({
    imageBuffer: originalImage,
    width: transform.width,
    height: transform.height,
  });
  // Save the thumbnail on S3
  await writeTransformedObjectToS3({
    key: newFileKey,
    bucketName: s3BucketFiles,
    body: processedImage,
  });
  logger.info('Saved image on S3', { details: newFileKey });

  metrics.addMetric('processedImages', MetricUnits.Count, 1);
};

const lambdaHandler = async (
  event: SQSEvent,
  context: Context
): Promise<void> => {
  // Batch size is 1, so we can safely assume that there is only one record
  const record = event.Records[0];

  const { body } = record;
  const objectKey = extractObjectKey(body);
  const fileId = extractFileId(objectKey);

  await markFileAs(fileId, FileStatus.WORKING);

  try {
    await timedOutAsyncOperation(
      processOne(fileId, objectKey),
      context.getRemainingTimeInMillis() - 3000
    );

    await markFileAs(fileId, FileStatus.DONE);
  } catch (error) {
    if (error instanceof TimeoutError) {
      logger.error('An unexpected error occurred', error as Error);
    }
    logger.info('Function is about to timeout, marking the asset as failed', {
      details: {
        timeToTimeout: context.getRemainingTimeInMillis(),
      },
    });

    await markFileAs(fileId, FileStatus.FAIL);

    logger.error('An unexpected error occurred', error as Error);

    throw error;
  }
};

export const handler = middy(lambdaHandler)
  .use(captureLambdaHandler(tracer))
  .use(injectLambdaContext(logger))
  .use(logMetrics(metrics));
