import type {
  EventBridgeEvent,
  APIGatewayProxyEventBase,
  Context,
} from "aws-lambda";
import type {
  Detail,
  DetailType,
} from "./common/types/EventBridgeScheduledEvent";
import { logger, tracer } from "./common/powertools";
import { cognitoClientV3 } from "./common/cognito-client";
import middy from "@middy/core";
import { injectLambdaContext } from "@aws-lambda-powertools/logger";
import { captureLambdaHandler } from "@aws-lambda-powertools/tracer";
import {
  CognitoIdentityProviderClient,
  AdminInitiateAuthCommand,
  SignUpCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { default as request } from "phin";
import * as imagemagick from "imagemagick";
import { createReadStream, promises } from "node:fs";

const cognitoUserPoolID = process.env.COGNITO_USER_POOL_ID || "";
const cognitoUserPoolClientID = process.env.COGNITO_USER_POOL_CLIENT_ID || "";
const dummyPassword = process.env.DUMMY_PASSWORD || "";
const apiUrl = process.env.API_URL || "";

const pickOneOf = (array: string[] | number[]) => {
  return Math.floor(Math.random() * array.length);
};

const generateDummyImage = (filename: string) => {
  const values = {
    background_color: "#FFFFF",
    file_extension: pickOneOf(["png", "jpg"]),
    file_location: "/tmp",
    file_name: filename,
    gravity: "center",
    height: [200, 400, 600],
    point_size: 30,
    resolution: 72,
    size: 512,
    sampling_factor: 3,
    text_color: "#000000",
    text_to_display: "Test image",
    width: [200, 400, 600],
  };

  const params = [
    "-density",
    `${values.resolution * values.sampling_factor}`,
    "-size",
    `${values.size * values.sampling_factor}x${
      values.size * values.sampling_factor
    }`,
    `canvas:${values.background_color}`,
    "-fill",
    values.text_color,
    "-pointsize",
    `${values.point_size}`,
    "-gravity",
    `${values.gravity}`,
    "-annotate",
    "+0+0",
    `${values.text_to_display}`,
    "-resample",
    `${values.resolution}`,
    `${values.file_location}/${values.file_name}.${values.file_extension}`,
  ];

  return new Promise((resolve, reject) => {
    imagemagick.convert(params, (err, data) => {
      if (err) {
        reject(err);
      }
      resolve(data);
    });
  });
};

const authenticateUser = async (username: string, password: string) => {
  const params = {
    AuthFlow: "ADMIN_USER_PASSWORD_AUTH",
    ClientId: process.env.COGNITO_USER_POOL_CLIENT_ID,
    UserPoolId: process.env.COGNITO_USER_POOL_ID,
    AuthParameters: {
      USERNAME: username,
      PASSWORD: password,
    },
  };

  const cognitoClient = new CognitoIdentityProviderClient({
    region: process.env.AWS_REGION,
  });

  try {
    return await cognitoClient.send(new AdminInitiateAuthCommand(params));
  } catch (err: unknown) {
    logger.error("Unexpected error", err as Error);
  }
};

const createUser = async (
  username: string,
  email: string,
  password: string
) => {
  const cognitoClient = new CognitoIdentityProviderClient({
    region: process.env.AWS_REGION,
  });

  const params = {
    ClientId: process.env.COGNITO_USER_POOL_CLIENT_ID,
    Password: password,
    Username: username,
    UserAttributes: [
      {
        Name: "email",
        Value: email,
      },
    ],
  };

  try {
    return await cognitoClient.send(new SignUpCommand(params));
  } catch (err) {
    logger.error("error", err as Error);
    throw err;
  }
};

const simulateTrafficOfSingleUser = async () => {
  const username = `sgerion+${Date.now()}`;
  const email = `${username}@amazon.com`;
  const password = "ABCabc123456789!";

  try {
    await createUser(username, email, password);
  } catch (err) {
    logger.error("Error while creating the user", err as Error);
    return;
  }

  let authenticatedUser;
  try {
    authenticatedUser = await authenticateUser(username, password);
  } catch (error: unknown) {
    logger.error("Error while authenticating the user", error as Error);
    return;
  }

  logger.info("Authenticated user", { data: authenticatedUser });

  const response = await fetch(
    "https://di82qpttzbiua.cloudfront.net/api/get-presigned-url?type=image%2Fpng",
    {
      headers: {
        accept: "application/json",
        authorization: authenticatedUser.AuthenticationResult.AccessToken,
      },
      method: "GET",
    }
  );
  const preSignURL = await response.json();
  logger.info("pre-sign url", { data: preSignURL });

  const dummyImage = await generateDummyImage(username);
  logger.info("generateDummyImage results", { data: dummyImage });

  const stats = await promises.stat(`/tmp/${username}.png`);
  const fileSizeInBytes = stats.size;
  logger.info("is file", { data: stats.isFile() });
  logger.info("is file", { data: stats.size });
  logger.info("is directory", { data: stats.isDirectory() });

  let readStream = createReadStream(`/tmp/${username}.png`);
  // @ts-ignore
  const uploadResponse = await fetch(preSignURL.data, {
    method: "PUT",
    headers: {
      "content-length": fileSizeInBytes.toString(),
      "content-type": "image/png",
    },
    body: readStream,
  });

  logger.info("uploadResponse status", { data: uploadResponse });
};

const lambdaHandler = async (
  event: APIGatewayProxyEventBase<any>,
  context: Context
): Promise<void> => {
  await simulateTrafficOfSingleUser();
};

const handler = middy(lambdaHandler)
  .use(captureLambdaHandler(tracer))
  .use(injectLambdaContext(logger, { logEvent: true }));

export { handler };

// Alternative code, feel free to pick any change and delete anything else

/* const getAccessTokenForUser = async (
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
}; */

/* const uploadAsset = async (
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
}; */

/* const getPresignedUrl = async (accessToken: string): Promise<string> => {
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
}; */

/* const getOriginalAsset = async (): Promise<Buffer> => {
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
}; */

/* const handler = middy(
  async (_event: EventBridgeEvent<DetailType, Detail>): Promise<void> => {
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
  .use(injectLambdaContext(logger, { logEvent: true })); */
