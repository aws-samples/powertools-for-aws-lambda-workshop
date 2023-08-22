import { RekognitionClient } from '@aws-sdk/client-rekognition';
import { tracer } from '@powertools';

const rekognitionClient = new RekognitionClient({
  region: process.env.AWS_REGION || 'eu-central-1',
});
tracer.captureAWSv3Client(rekognitionClient);

export { rekognitionClient };
