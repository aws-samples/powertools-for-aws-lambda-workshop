import { EventBridgeClient } from '@aws-sdk/client-eventbridge';
import { tracer } from '@powertools';

const eventbridgeClient = new EventBridgeClient({
  region: process.env.AWS_REGION || 'eu-central-1',
});
tracer.captureAWSv3Client(eventbridgeClient);

export { eventbridgeClient };
