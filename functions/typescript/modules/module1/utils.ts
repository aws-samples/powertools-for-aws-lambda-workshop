import { Readable } from 'node:stream';
import { s3Client } from '@commons/clients/s3';
import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { readFile } from 'node:fs/promises';
import { updateFileStatus } from '@graphql/mutations';
import { makeGraphQlOperation } from '@commons/appsync-signed-operation';
import sharp from 'sharp';
import type {
  CreateThumbnailParams,
  FileStatusValue,
  WriteBufferToS3Props,
  WriteFileToS3Props,
} from './types';

/**
 * Utility function to parse and extract the object key from the body of a SQS Record.
 *
 * Given a stringified representation of a body like this:
 * ```json
 * {
 *   "detail": {
 *     "object": {
 *       "key": "uploads/images/jpg/79894e50c10c40889087194b76c5f1cb.jpg"
 *     }
 *   }
 * }
 * ```
 *
 * It returns `uploads/images/jpg/79894e50c10c40889087194b76c5f1cb.jpg`.
 *
 * @param {string} body - Body of the SQS message
 */
const extractObjectKey = (body: string): string => {
  const {
    detail: {
      object: { key: objectKey },
    },
  } = JSON.parse(body);

  return objectKey;
};

/**
 * Utility function to extract the file id from a S3 Object key.
 *
 * Given this key `uploads/images/jpg/79894e50c10c40889087194b76c5f1cb.jpg`, it returns `79894e50c10c40889087194b76c5f1cb`.
 *
 * @param {string} objectKey - Key of the S3 object
 */
const extractFileId = (objectKey: string): string =>
  objectKey.split('/').at(-1)!.split('.')[0];

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
  const stream = res.Body! as Readable;

  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.once('end', () => resolve(Buffer.concat(chunks)));
    stream.once('error', reject);
  });
};

/**
 * Timeout Error thrown when the async operation takes longer than the specified timeout.
 */
class TimeoutError extends Error {
  public constructor(message?: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'TimeoutError';
  }
}

/**
 * Utility function to help handle Lambda time out.
 *
 * The function creates a Promise.race between your long runing async operation
 * and a second promise that rejects after the specified timeout.
 *
 * By specifying a timeout shorter than the maximum Lambda Function duration, you're given some buffer
 * to handle cleanup operations and/or gracefully handle failures.
 *
 * **Note:** Keep in mind that Node.js handles timeouts according to the
 * [Node.js Event Loop](https://nodejs.org/en/docs/guides/event-loop-timers-and-nexttick/#setTimeout-vs-setInterval)
 * this means that the timeout is not guaranteed to be triggered at the exact time specified.
 *
 * @example
 * ```ts
 * try {
 *   const myLongAsyncOperation;
 *   await timedOutAsyncOperation(
 *     myLongAsyncOperation,
 *     context.getRemainingTimeInMillis() - 5000
 *   )
 * } catch (error) {
 *   if (error instanceof TimeoutError) {
 *     // handle timeout here
 *   }
 *   // handle all other errors
 * }
 * ```
 *
 * @param {typeof Promise} longAsyncOperation - Promise that does a time consuming async operation
 * @param {number} time - Max time to trigger a timeout rejection in milliseconds (suggested `context.getRemainingTimeInMillis() - ms`)
 */
const timedOutAsyncOperation = async (
  longAsyncOperation: unknown,
  time: number
): Promise<unknown> =>
  await Promise.race([
    longAsyncOperation,
    new Promise((_, reject) => {
      const timer = setTimeout(() => reject(new TimeoutError()), time);
      timer.unref();
    }),
  ]);

/**
 * Utility function to create a thumbnail from an image.
 */
const createThumbnail = async ({
  imageBuffer,
  width,
  height,
}: CreateThumbnailParams): Promise<Buffer> => {
  const resizedImg = await sharp(imageBuffer)
    .resize(width, height)
    .toFormat('webp')
    .toBuffer();

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
  status: FileStatusValue
): Promise<void> => {
  await makeGraphQlOperation(process.env.API_URL || '', {
    query: updateFileStatus,
    operationName: 'UpdateFileStatus',
    variables: {
      input: {
        id: fileId,
        status,
      },
    },
  });
};

export {
  extractFileId,
  extractObjectKey,
  getOriginalObject,
  writeTransformedObjectToS3,
  markFileAs,
  createThumbnail,
  TimeoutError,
  timedOutAsyncOperation,
};
