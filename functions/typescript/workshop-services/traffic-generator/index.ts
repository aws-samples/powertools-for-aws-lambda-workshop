import { injectLambdaContext } from '@aws-lambda-powertools/logger/middleware';
import { captureLambdaHandler } from '@aws-lambda-powertools/tracer/middleware';
import { AdminInitiateAuthCommand } from '@aws-sdk/client-cognito-identity-provider';
import { cognitoClient } from '@commons/clients/cognito';
import { generatePresignedUploadUrl } from '@graphql/mutations';
import middy from '@middy/core';
import { logger, tracer } from '@powertools';
import { Headers, fetch } from 'undici';
import type { GeneratePresignedUploadUrlMutation } from '../../types/API';

const cognitoUserPoolID = process.env.COGNITO_USER_POOL_ID || '';
const cognitoUserPoolClientID = process.env.COGNITO_USER_POOL_CLIENT_ID || '';
const dummyPassword = process.env.DUMMY_PASSWORD || '';
const apiUrl = process.env.API_URL || '';

const getRandomNumberInRange = (min: number, max: number): number =>
  Math.floor(Math.random() * max) + min;

const delay = (seconds: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, seconds * 1000));

const getAccessTokenForUser = async (
  username: string,
  password: string,
  cognitoUserPoolID: string,
  cognitoUserPoolClientID: string
): Promise<string> => {
  try {
    const response = await cognitoClient.send(
      new AdminInitiateAuthCommand({
        AuthFlow: 'ADMIN_USER_PASSWORD_AUTH',
        ClientId: cognitoUserPoolClientID,
        UserPoolId: cognitoUserPoolID,
        AuthParameters: {
          USERNAME: username,
          PASSWORD: password,
        },
      })
    );

    if (
      !response.AuthenticationResult ||
      !response.AuthenticationResult?.AccessToken
    ) {
      logger.error(
        'Unable to find access token in authenticated user response',
        { data: response }
      );
      throw new Error(
        'Unable to find access token in authenticated user response'
      );
    }
    logger.info('Access token retrieved', {
      data: response.AuthenticationResult.AccessToken,
    });

    return response.AuthenticationResult.AccessToken;
  } catch (err) {
    logger.error('Error while authenticating the user', err as Error);
    throw err;
  }
};

const getPresignedUrl = async (accessToken: string): Promise<string> => {
  try {
    const graphQLOperation = {
      query: generatePresignedUploadUrl,
      variables: {
        input: {
          type: 'image/png',
        },
      },
    };
    const res = await fetch(apiUrl, {
      headers: new Headers({
        accept: 'application/json',
        authorization: accessToken,
      }),
      method: 'POST',
      body: JSON.stringify(graphQLOperation),
    });

    if (!res.ok) throw new Error('Unexpected response from AppSync API');
    const body = (await res.json()) as GeneratePresignedUploadUrlMutation;

    logger.info('pre-sign url - response body', { data: body });

    if (!body.generatePresignedUploadUrl)
      throw new Error(
        'Missing generatePresignedUploadUrl key in response body'
      );

    return body.generatePresignedUploadUrl.url;
  } catch (err) {
    logger.error('Error while obtaining presigned url', {
      data: { accessToken },
      error: err as Error,
    });

    throw err;
  }
};

const getOriginalAsset = async (): Promise<Blob> => {
  const assets = [
    'https://github.githubassets.com/images/modules/logos_page/Octocat.png',
  ];
  const assetUrl = assets[Math.floor(Math.random() * assets.length)]; // Get a random asset

  try {
    const res = await fetch(assetUrl);

    if (!res.ok) {
      throw new Error(`Unexpected response ${res.status}`);
    }

    logger.info('getOriginalAsset request status', {
      data: res.status,
    });

    if (!res.body) throw new Error(`No body returned ${res.status}`);

    return res.blob();
  } catch (err) {
    logger.error('Error while obtaining image', err as Error);
    throw err;
  }
};

const uploadAsset = async (
  presignedURL: string,
  asset: Blob
): Promise<void> => {
  try {
    const res = await fetch(presignedURL, {
      headers: new Headers({
        'content-type': 'image/png',
      }),
      method: 'PUT',
      body: asset,
    });
    if (!res.ok) throw new Error('Unexpected response from S3');

    logger.info('uploadResponse status', { data: res.status });

    return;
  } catch (err) {
    logger.error('Error while uploading image', err as Error);
    throw err;
  }
};

const simulateTrafficOfUser = async (
  accessToken: string,
  asset: Blob
): Promise<void> => {
  for (let i = 1; i <= getRandomNumberInRange(1, 20); i++) {
    const presignedURL = await getPresignedUrl(accessToken);
    if (presignedURL) {
      await uploadAsset(presignedURL, asset);
      await delay(getRandomNumberInRange(1, 5));
    }
  }
};

const getAccessTokens = async (): Promise<PromiseSettledResult<string>[]> => {
  const accessTokens: Promise<string>[] = [];
  for (let i: number = 1; i <= 50; i++) {
    const email = `dummyuser+${i}@example.com`;

    const accessToken = getAccessTokenForUser(
      email,
      dummyPassword,
      cognitoUserPoolID,
      cognitoUserPoolClientID
    );

    accessTokens.push(accessToken);
  }

  return Promise.allSettled(accessTokens);
};

const lambdaHandler = async (): Promise<void> => {
  const assetBuffer = await getOriginalAsset();
  const accessTokensPromises = await getAccessTokens();

  const usersTrafficPromises = accessTokensPromises.map(
    (promiseResult: PromiseSettledResult<string>): Promise<void> => {
      if (promiseResult && promiseResult.status === 'fulfilled') {
        return simulateTrafficOfUser(promiseResult.value, assetBuffer);
      }

      return Promise.resolve();
    }
  );
  await Promise.allSettled(usersTrafficPromises);
};

const handler = middy(lambdaHandler)
  .use(captureLambdaHandler(tracer))
  .use(injectLambdaContext(logger, { logEvent: true }));

export { handler };
