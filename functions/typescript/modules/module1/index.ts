import { injectLambdaContext } from '@aws-lambda-powertools/logger';
import { MetricUnits, logMetrics } from '@aws-lambda-powertools/metrics';
import { captureLambdaHandler } from '@aws-lambda-powertools/tracer';
import { logger, metrics, tracer } from '@commons/powertools';
import {
  FileStatus,
  ImageSize,
  TransformSize,
  transformedImageExtension,
  transformedImagePrefix,
} from '@constants';
import middy from '@middy/core';
import type { EventBridgeEvent } from 'aws-lambda';
import {
  createThumbnail,
  extractFileId,
  getOriginalObject,
  markFileAs,
  writeTransformedObjectToS3,
} from './utils';
import { Detail, DetailType } from './types';

const s3BucketFiles = process.env.BUCKET_NAME_FILES || '';

const processOne = async (fileId: string, objectKey: string): Promise<void> => {
  const newFileKey = `${transformedImagePrefix}/${fileId}${transformedImageExtension}`;
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
  event: EventBridgeEvent<DetailType, Detail>
): Promise<void> => {
  const objectKey = event.detail.object.key;
  const fileId = extractFileId(objectKey);

  await markFileAs(fileId, FileStatus.WORKING);

  try {
    await processOne(fileId, objectKey);

    await markFileAs(fileId, FileStatus.DONE);
  } catch (error) {
    logger.error('An unexpected error occurred', error as Error);

    await markFileAs(fileId, FileStatus.FAIL);

    throw error;
  }
};

export const handler = middy(lambdaHandler)
  .use(captureLambdaHandler(tracer))
  .use(injectLambdaContext(logger, { logEvent: true }))
  .use(logMetrics(metrics));
