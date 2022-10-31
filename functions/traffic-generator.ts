import type { EventBridgeEvent } from "aws-lambda";
import type {
  Detail,
  DetailType,
} from "./common/types/EventBridgeScheduledEvent";
import { logger, tracer } from "./common/powertools";
import { cognitoClientV3 } from "./common/cognito-client";
import middy from "@middy/core";
import { injectLambdaContext } from "@aws-lambda-powertools/logger";
import { captureLambdaHandler } from "@aws-lambda-powertools/tracer";
import { AdminInitiateAuthCommand } from "@aws-sdk/client-cognito-identity-provider";
import { default as request } from "phin";

const cognitoUserPoolID = process.env.COGNITO_USER_POOL_ID || "";
const cognitoUserPoolClientID = process.env.COGNITO_USER_POOL_CLIENT_ID || "";
const dummyPassword = process.env.DUMMY_PASSWORD || "";
const apiUrl = process.env.API_URL || "";

const getAccessTokenForUser = async (
  username: string,
  password: string,
  cognitoUserPoolID: string,
  cognitoUserPoolClientID: string
): Promise<string> => {
  try {
    const res = await cognitoClientV3.send(
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

    if (!res.AuthenticationResult || !res.AuthenticationResult?.AccessToken)
      throw new Error("Unable to find access token in authenticated user");

    return res.AuthenticationResult.AccessToken;
  } catch (err) {
    logger.error("Error while authenticating the user", err as Error);
    throw err;
  }
};

const getPresignedUrl = async (accessToken: string): Promise<string> => {
  let presignedURL: string;
  try {
    const res = await request<{ data: string }>({
      url: `${apiUrl}/get-presigned-url?type=image%2Fpng`,
      headers: {
        accept: "application/json",
        authorization: accessToken,
      },
      method: "GET",
      timeout: 5000,
      parse: "json",
    });

    presignedURL = res.body.data;
    logger.info("pre-sign url", { data: res.body.data });

    return res.body.data;
  } catch (err) {
    logger.error("Error while obtaining presigned url", err as Error);
    throw err;
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

const uploadAsset = async (
  presignedURL: string,
  assetBuffer: Buffer
): Promise<void> => {
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

export const handler = middy(
  async (event: EventBridgeEvent<DetailType, Detail>): Promise<void> => {
    const email = `dummyuser+${Math.floor(
      Math.random() * (50 - 1 + 1) + 1
    )}@example.com`; // Pseudo-randomly uses one of the 50 users in the pool

    const accessToken = await getAccessTokenForUser(
      email,
      dummyPassword,
      cognitoUserPoolID,
      cognitoUserPoolClientID
    );
    const presignedURL = await getPresignedUrl(accessToken);
    const assetBuffer = await getOriginalAsset();
    await uploadAsset(presignedURL, assetBuffer);
  }
)
  .use(captureLambdaHandler(tracer))
  .use(injectLambdaContext(logger, { logEvent: true }));
