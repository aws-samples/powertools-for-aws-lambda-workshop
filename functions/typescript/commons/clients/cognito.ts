import { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';
import { tracer } from '@powertools';

const cognitoClient = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION || 'eu-central-1',
});
tracer.captureAWSv3Client(cognitoClient);

export { cognitoClient };
