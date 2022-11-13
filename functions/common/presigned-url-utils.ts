import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { s3ClientV3 } from "./s3-client";

/**
 * Utility function that given a key and a bucket name returns a presigned download url
 *
 * @param {string} key - Key of the object to presign
 * @param {string} bucketName - Name of the S3 bucket where the object resides
 */
export const getPresignedDownloadUrl = async (
  key: string,
  bucketName: string
): Promise<string> =>
  await getSignedUrl(
    s3ClientV3,
    new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    }),
    {
      expiresIn: 3600,
    }
  );

/**
 * Utility function that given a key and a bucket name returns a presigned upload url
 *
 * @param {string} key - Key of the object to presign
 * @param {string} bucketName - Name of the S3 bucket where the object will reside
 */
export const getPresignedUploadUrl = async (
  key: string,
  bucketName: string,
  type: string
): Promise<string> =>
  getSignedUrl(
    s3ClientV3,
    new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      ContentType: type,
    }),
    {
      expiresIn: 3600,
    }
  );
