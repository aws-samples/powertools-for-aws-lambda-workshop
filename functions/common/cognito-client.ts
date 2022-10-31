import { CognitoIdentityProviderClient } from "@aws-sdk/client-cognito-identity-provider";
import { tracer } from "./powertools";

const cognitoClientV3 = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION || "eu-central-1",
});
tracer.captureAWSv3Client(cognitoClientV3);

export { cognitoClientV3 };
