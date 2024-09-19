import { randomUUID } from 'node:crypto';
import {
  FileStatus,
  ImageSize,
  TransformSize,
  transformedImageExtension,
  transformedImagePrefix,
} from '@constants';
import middy from '@middy/core';
import type { Context, EventBridgeEvent } from 'aws-lambda';
import type { Detail, DetailType, ProcessOneOptions } from './types.js';
import {
  createThumbnail,
  getImageMetadata,
  getOriginalObject,
  markFileAs,
  writeTransformedObjectToS3,
} from './utils.js';

const s3BucketFiles = process.env.BUCKET_NAME_FILES || '';
const filesTableName = process.env.TABLE_NAME_FILES || '';

const processOne = async ({
  objectKey,
}: ProcessOneOptions): Promise<string> => {
  const newObjectKey = `${transformedImagePrefix}/${randomUUID()}${transformedImageExtension}`;
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
    key: newObjectKey,
    bucketName: s3BucketFiles,
    body: processedImage,
  });
  console.log(`Saved image on S3: ${newObjectKey}`);

  return newObjectKey;
};

const lambdaHandler = async (
  event: EventBridgeEvent<DetailType, Detail>,
  _context: Context
): Promise<void> => {
  // Extract file info from the event and fetch additional metadata from DynamoDB
  const objectKey = event.detail.object.key;
  const etag = event.detail.object.etag;
  const { fileId, userId } = await getImageMetadata(filesTableName, objectKey);

  // Mark file as working, this will notify subscribers that the file is being processed
  await markFileAs(fileId, FileStatus.WORKING);

  try {
    const newObjectKey = await processOne({
      fileId,
      objectKey,
      userId,
      etag,
    });

    await markFileAs(fileId, FileStatus.DONE, newObjectKey);
  } catch (error) {
    console.error('An unexpected error occurred', error);

    await markFileAs(fileId, FileStatus.FAIL);

    throw error;
  }
};

export const handler = middy(lambdaHandler);
