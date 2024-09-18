import { setTimeout } from 'node:timers/promises';
import type { SignUpCommandOutput } from '@aws-sdk/client-cognito-identity-provider';
import { SignUpCommand } from '@aws-sdk/client-cognito-identity-provider';
import type { CloudFormationCustomResourceEvent } from 'aws-lambda';

import { injectLambdaContext } from '@aws-lambda-powertools/logger/middleware';
import { captureLambdaHandler } from '@aws-lambda-powertools/tracer/middleware';
import { cognitoClient } from '@commons/clients/cognito';
import middy from '@middy/core';
import { logger, tracer } from '@powertools';

const cognitoUserPoolClientID = process.env.COGNITO_USER_POOL_CLIENT_ID || '';
const dummyPassword = process.env.DUMMY_PASSWORD || '';

const createUser = async (
  email: string,
  password: string,
  cognitoUserPoolClientID: string
): Promise<SignUpCommandOutput> => {
  try {
    return await cognitoClient.send(
      new SignUpCommand({
        ClientId: cognitoUserPoolClientID,
        Password: password,
        Username: email,
      })
    );
  } catch (err) {
    logger.error('error', err as Error);
    throw err;
  }
};

export const handler = middy(
  async (event: CloudFormationCustomResourceEvent) => {
    if (event.RequestType === 'Create') {
      for await (const idx of Array(25).keys()) {
        const email = `dummyuser+${idx + 1}@example.com`;
        const password = dummyPassword;

        try {
          await createUser(email, password, cognitoUserPoolClientID);
        } catch (err) {
          logger.error('Error while creating the user', err as Error);

          return;
        }

        await setTimeout(250); // Simple throttle to ~4 signups / second
      }
    } else {
      return;
    }
  }
)
  .use(captureLambdaHandler(tracer))
  .use(injectLambdaContext(logger, { logEvent: true }));
