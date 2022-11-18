import { S3Client } from '@aws-sdk/client-s3';
import { tracer } from './powertools';

const s3ClientV3 = new S3Client({
  apiVersion: '2012-08-10',
  region: process.env.AWS_REGION || 'eu-central-1',
});
tracer.captureAWSv3Client(s3ClientV3);

export { s3ClientV3 };
