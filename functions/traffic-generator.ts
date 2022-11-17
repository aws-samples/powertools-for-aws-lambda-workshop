import type { EventBridgeEvent } from "aws-lambda";
import type {
  Detail,
  DetailType,
} from "./common/types/EventBridgeScheduledEvent";
import { logger, tracer } from "./common/powertools";
import { cognitoClientV3 } from "./common/cognito-client";
import { ImageSizes } from './common/types/TransformSizes';
import { generatePresignedUploadUrl } from './common/graphql/mutations';
import type { GeneratePresignedUploadUrlMutation } from './common/types/API';
import middy from "@middy/core";
import { injectLambdaContext } from "@aws-lambda-powertools/logger";
import { captureLambdaHandler } from "@aws-lambda-powertools/tracer";
import { AdminInitiateAuthCommand } from "@aws-sdk/client-cognito-identity-provider";
// @ts-ignore
import { default as request } from "phin";

const cognitoUserPoolID = process.env.COGNITO_USER_POOL_ID || "";
const cognitoUserPoolClientID = process.env.COGNITO_USER_POOL_CLIENT_ID || "";
const dummyPassword = process.env.DUMMY_PASSWORD || "";
const apiUrl = process.env.API_URL || "";

const getRandomNumberInRange = (min: number, max: number) => {
  return Math.floor(Math.random() * max) + min;
}

const delay = (seconds: number) => {
  return new Promise( resolve => setTimeout(resolve, seconds * 1000) );
}

const getAccessTokenForUser = async (
    username: string,
    password: string,
    cognitoUserPoolID: string,
    cognitoUserPoolClientID: string
): Promise<string> => {
  try {
    const response = await cognitoClientV3.send(
        new AdminInitiateAuthCommand({
          AuthFlow: "ADMIN_USER_PASSWORD_AUTH",
          ClientId: cognitoUserPoolClientID,
          UserPoolId: cognitoUserPoolID,
          AuthParameters: {
            USERNAME: username,
            PASSWORD: password,
          },
        })
    );

    if (!response.AuthenticationResult || !response.AuthenticationResult?.AccessToken) {
      logger.error("Unable to find access token in authenticated user response", { data: response })
      throw new Error("Unable to find access token in authenticated user response");
    }
    logger.info("Access token retrieved", { data: response.AuthenticationResult.AccessToken })
    return response.AuthenticationResult.AccessToken;
  } catch (err) {
    logger.error("Error while authenticating the user", err as Error);
    throw err;
  }
};

const getPresignedUrl = async (accessToken: string): Promise<string> => {
  try {
    const graphQLOperation = {
      query: generatePresignedUploadUrl,
      variables: {
        input: {
          type: "image/png",
          transformParams: ImageSizes.SMALL
        },
      },
    };
    const res = await request<GeneratePresignedUploadUrlMutation>({
      url: apiUrl,
      headers: {
        accept: "application/json",
        authorization: accessToken,
      },
      method: "POST",
      timeout: 5000,
      parse: "json",
      data: JSON.stringify(graphQLOperation)
    })

    logger.info("pre-sign url - response body", { data: res.body });

    if (!res.body.data.generatePresignedUploadUrl) throw new Error('Missing generatePresignedUploadUrl key in response body');

    return res.body.data.generatePresignedUploadUrl.url;
  } catch (err) {
    logger.error("Error while obtaining presigned url", { data: { accessToken }, error: err as Error });
  }
};

const getOriginalAsset = async (): Promise<Buffer> => {
  const assets = [
    "https://github.githubassets.com/images/modules/logos_page/Octocat.png",
  ];
  const assetUrl = assets[Math.floor(Math.random() * assets.length)]; // Get a random asset

  try {
    const res = await request(assetUrl);
    logger.info("getOriginalAsset request status", {
      data: res.statusCode,
    });

    if (res.errored) {
      throw new Error(`Unexpected response ${res.statusMessage}`);
    }

    if (!res.body) throw new Error(`No body returned ${res.statusMessage}`);

    return res.body;
  } catch (err) {
    logger.error("Error while obtaining image", err as Error);
    throw err;
  }
};

const uploadAsset = async (presignedURL: string, assetBuffer: Buffer): Promise<void> => {
  try {
    const res = await request({
      url: presignedURL,
      headers: {
        "content-type": "image/png",
      },
      method: "PUT",
      data: assetBuffer,
    });
    logger.info("uploadResponse status", { data: res.statusCode });
    if (res.errored) {
      throw new Error(`unexpected response ${res.statusMessage}`);
    }

    return;
  } catch (err) {
    logger.error("Error while uploading image", err as Error);
    throw err;
  }
};

const simulateTrafficOfUser = async (accessToken: string, assetBuffer: Buffer) => {
  for (let i = 1; i <= getRandomNumberInRange(1, 20); i++) {
    const presignedURL = await getPresignedUrl(accessToken);
    if (presignedURL) {
      await uploadAsset(presignedURL, assetBuffer);
      await delay(getRandomNumberInRange(1, 5));
    }
  }
}

const getAccessTokens = async (): Promise<string[]> => {
  const accessTokens: Promise<string>[] = [];
  for(let i: number = 1; i <= 50; i++) {
    const email = `dummyuser+${i}@example.com`;

    const accessToken = getAccessTokenForUser(
        email,
        dummyPassword,
        cognitoUserPoolID,
        cognitoUserPoolClientID
    );

    accessTokens.push(accessToken);
  }

  return Promise.all(accessTokens);
}

const lambdaHandler = async (_event: EventBridgeEvent<DetailType, Detail>): Promise<void> => {
  const assetBuffer = await getOriginalAsset();
  const accessTokens = await getAccessTokens();

  const usersTrafficPromises = accessTokens.map((accessToken: string): Promise<void> => {
      return simulateTrafficOfUser(accessToken, assetBuffer);
  })
  await Promise.all(usersTrafficPromises);
}

const handler = middy(lambdaHandler)
    .use(captureLambdaHandler(tracer))
    .use(injectLambdaContext(logger, { logEvent: true }));

export { handler };