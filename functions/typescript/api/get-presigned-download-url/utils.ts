import { GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { dynamodbClient } from '@commons/clients/dynamodb';
import { s3Client } from '@commons/clients/s3';
import type { GetFileKeyParams, GetPresignedDownloadUrlParams } from './types';

/**
 * Utility function that given a key and a bucket name returns a presigned download url
 */
const getPresignedDownloadUrl = async ({
  objectKey,
  bucketName,
}: GetPresignedDownloadUrlParams): Promise<string> =>
  await getSignedUrl(
    s3Client,
    new GetObjectCommand({
      Bucket: bucketName,
      Key: objectKey,
    }),
    {
      expiresIn: 3600,
    }
  );

/**
 * Utility function that given a file id and a user id returns the file id from Amazon DynamoDB
 */
const getFileIdFromStore = async ({
  fileId,
  userId,
  dynamodb,
}: GetFileKeyParams): Promise<string> => {
  const res = await dynamodbClient.query({
    TableName: dynamodb.tableName,
    IndexName: dynamodb.indexName,
    KeyConditionExpression: '#id = :id AND #userId = :userId',
    FilterExpression: '#status = :status',
    ExpressionAttributeNames: {
      '#status': 'status',
      '#id': 'id',
      '#userId': 'userId',
    },
    ExpressionAttributeValues: {
      ':status': 'completed',
      ':id': fileId,
      ':userId': userId,
    },
  });
  if (!res.Items || res.Items.length === 0)
    throw new Error('Unable to find object');

  return res.Items[0].transformedFileKey;
};

export { getPresignedDownloadUrl, getFileIdFromStore };
