import { PutObjectCommand } from '@aws-sdk/client-s3';
import { readFile } from 'node:fs/promises';
import { s3ClientV3 } from './s3-client';

/**
 * @param {string} key - The key to be used for the new object on S3
 * @param {string} bucketName - The bucket name where the file is uploaded
 */
interface SaveFileToS3PropsBase {
  key: string
  bucketName: string
}

/**
 * @param {string} pathToFile - The local path where the file is stored
 */
interface SaveFileToS3Props extends SaveFileToS3PropsBase {
  pathToFile: string
  body?: never
}

/**
 * @param {Buffer} - The buffer containing the file
 */
interface SaveBufferToS3Props extends SaveFileToS3PropsBase {
  body: Buffer
  pathToFile?: never
}

/**
 * Utility function that helps to save a file to S3.
 *
 * It always requires a key and bucket name that will be used to save the file to S3.
 * The third parameter can be either a buffer, if you already have the asset in memory,
 * or a path. If you pass a path the function will try to read it before uploading it.
 *
 * @param {SaveBufferToS3Props | SaveFileToS3Props} props - Object with key, bucket, and buffer or path to file
 */
export const saveAssetToS3 = async (
  props: SaveBufferToS3Props | SaveFileToS3Props
) => {
  let fileBody = props.body;
  if (props.pathToFile) {
    fileBody = await readFile(props.pathToFile);
  }
  await s3ClientV3.send(
    new PutObjectCommand({
      Bucket: props.bucketName,
      Key: props.key,
      Body: fileBody,
    })
  );
};
