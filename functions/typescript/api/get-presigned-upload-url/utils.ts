import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { s3Client } from '@commons/clients/s3';
import { dynamodbClient } from '@commons/clients/dynamodb';
import type {
  GetPresignedUploadUrlParams,
  StoreFileMetadataParams,
} from './types';

/**
 * Utility function that given a key and a bucket name returns a presigned upload url
 */
const getPresignedUploadUrl = async ({
  key,
  bucketName,
  type,
}: GetPresignedUploadUrlParams): Promise<string> =>
  getSignedUrl(
    s3Client,
    new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      ContentType: type,
    }),
    {
      expiresIn: 3600,
    }
  );

/**
 * Utility function that stores file metadata in Amazon DynamoDB
 */
const storeFileMetadata = async ({
  id,
  key,
  type,
  userId,
  dynamodb,
}: StoreFileMetadataParams): Promise<void> => {
  await dynamodbClient.put({
    TableName: dynamodb.tableName,
    Item: {
      id,
      key,
      status: 'created',
      type,
      userId,
    },
  });
};

export { getPresignedUploadUrl, storeFileMetadata };
