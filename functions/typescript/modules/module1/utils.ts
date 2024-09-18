import { readFile } from 'node:fs/promises';
import type { Readable } from 'node:stream';
import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { makeGraphQlOperation } from '@commons/appsync-signed-operation';
import { dynamodbClient } from '@commons/clients/dynamodb';
import { s3Client } from '@commons/clients/s3';
import { updateFileStatus } from '@graphql/mutations';
import { Jimp } from 'jimp';
import type {
  CreateThumbnailParams,
  FileStatusValue,
  WriteBufferToS3Props,
  WriteFileToS3Props,
} from './types';

/**
 * Utility function to extract the file id from a S3 Object key.
 *
 * Given this key `uploads/images/jpg/79894e50c10c40889087194b76c5f1cb.jpg`, it returns `79894e50c10c40889087194b76c5f1cb`.
 *
 * @param {string} objectKey - Key of the S3 object
 */
const extractFileId = (objectKey: string): string => {
  const fileName = objectKey.split('/').at(-1);
  if (!fileName) {
    throw new Error('Invalid file name');
  }
  return fileName.split('.')[0];
};

/**
 * Utility function to get the metadata of a given image from DynamoDB.
 */
const getImageMetadata = async (
  tableName: string,
  objectKey: string
): Promise<{ fileId: string; userId: string }> => {
  const res = await dynamodbClient.get({
    TableName: tableName,
    Key: {
      id: extractFileId(objectKey),
    },
    AttributesToGet: ['id', 'userId'],
  });

  if (!res.Item) {
    throw new Error('File metadata not found');
  }

  return {
    fileId: res.Item.id,
    userId: res.Item.userId,
  };
};

/**
 * Utility function that helps to get an object from S3.
 */
const getOriginalObject = async (
  key: string,
  bucketName: string
): Promise<Buffer> => {
  const res = await s3Client.send(
    new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    })
  );
  const stream = res.Body as Readable;

  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.once('end', () => resolve(Buffer.concat(chunks)));
    stream.once('error', reject);
  });
};

/**
 * Utility function to create a thumbnail from an image.
 */
const createThumbnail = async ({
  imageBuffer,
  width,
  height,
}: CreateThumbnailParams): Promise<Buffer> => {
  const img = await Jimp.read(imageBuffer);
  const resizedImg = await img
    .resize({ w: width, h: height })
    .getBuffer('image/jpeg', { quality: 60 });

  return resizedImg;
};

/**
 * Utility function that helps to save a file to S3.
 *
 * It always requires a key and bucket name that will be used to save the file to S3.
 * The third parameter can be either a buffer, if you already have the asset in memory,
 * or a path. If you pass a path the function will try to read it before uploading it.
 */
const writeTransformedObjectToS3 = async ({
  key,
  bucketName,
  body,
  pathToFile,
}: WriteBufferToS3Props | WriteFileToS3Props): Promise<void> => {
  let fileBody = body;
  if (pathToFile) {
    fileBody = await readFile(pathToFile);
  }
  await s3Client.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: fileBody,
    })
  );
};

/**
 * Utility function to update the status of a given asset.
 *
 * It takes a fileId and a status and it triggers an AppSync Mutation.
 * The mutation has two side effects:
 * - Write the new state in the DynamoDB Table
 * - Forward the update to any subscribed client (i.e. the frontend app)
 *
 * @param {string} fileId - The id of the file to update
 * @param {FileStatusValue} status - Status of the file after the mutation update
 */
const markFileAs = async (
  fileId: string,
  status: FileStatusValue,
  transformedFileKey?: string
): Promise<void> => {
  await makeGraphQlOperation(process.env.APPSYNC_ENDPOINT || '', {
    query: updateFileStatus,
    operationName: 'UpdateFileStatus',
    variables: {
      input: {
        id: fileId,
        status,
        transformedFileKey,
      },
    },
  });
};

export {
  extractFileId,
  getOriginalObject,
  writeTransformedObjectToS3,
  markFileAs,
  createThumbnail,
  getImageMetadata,
};
