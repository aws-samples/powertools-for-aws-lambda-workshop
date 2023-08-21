import { FileStatus } from '@constants';

/**
 * @param {string} key - The key to be used for the new object on S3
 * @param {string} bucketName - The bucket name where the file is uploaded
 */
interface WriteFileToS3PropsBase {
  key: string;
  bucketName: string;
}

/**
 * @param {string} pathToFile - The local path where the file is stored
 */
interface WriteFileToS3Props extends WriteFileToS3PropsBase {
  pathToFile: string;
  body?: never;
}

/**
 * @param {Buffer} - The buffer containing the file
 */
interface WriteBufferToS3Props extends WriteFileToS3PropsBase {
  body: Buffer;
  pathToFile?: never;
}

type FileStatusKey = keyof typeof FileStatus;
type FileStatusValue = (typeof FileStatus)[FileStatusKey];

type CreateThumbnailParams = {
  imageBuffer: Buffer;
  width: number;
  height: number;
};

export {
  WriteFileToS3Props,
  WriteBufferToS3Props,
  FileStatusKey,
  FileStatusValue,
  CreateThumbnailParams,
};
