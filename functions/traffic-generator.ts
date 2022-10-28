import { logger, tracer } from "./common/powertools";
import middy from "@middy/core";
import { injectLambdaContext } from "@aws-lambda-powertools/logger";
import { captureLambdaHandler } from "@aws-lambda-powertools/tracer";

import { APIGatewayProxyEventBase, Context } from "aws-lambda"
import { CognitoIdentityProviderClient, SignUpCommand, AdminInitiateAuthCommand } from "@aws-sdk/client-cognito-identity-provider";
import fetch from "node-fetch";
import { createWriteStream, createReadStream, promises } from 'node:fs';
import { pipeline } from 'node:stream';
import { promisify } from 'node:util'

const authenticateUser = async (username: string, password: string) => {
    const params = {
        AuthFlow: 'ADMIN_USER_PASSWORD_AUTH',
        ClientId: process.env.COGNITO_USER_POOL_CLIENT_ID,
        UserPoolId: process.env.COGNITO_USER_POOL_ID,
        AuthParameters: {
            USERNAME: username,
            PASSWORD: password
        }
    }

    const cognitoClient = new CognitoIdentityProviderClient({
        region: process.env.AWS_REGION
    })

    try {
        return await cognitoClient.send(new AdminInitiateAuthCommand(params))
    } catch(err: unknown) {
        logger.error('Unexpected error', err as Error)
    }
};

const createUser = async (username: string, email: string, password: string) => {
    const cognitoClient = new CognitoIdentityProviderClient({region: process.env.AWS_REGION});

    const params = {
        ClientId: process.env.COGNITO_USER_POOL_CLIENT_ID,
        Password: password,
        Username: username,
        UserAttributes: [
            {
                Name: 'email',
                Value: email
            }
        ]
    }

    try {
        return await cognitoClient.send(new SignUpCommand(params))
    } catch (err) {
        logger.error('error', err as Error);
        throw err;
    }
}

const lambdaHandler = async (event: APIGatewayProxyEventBase<any>, context: Context): Promise<void> => {

    const username = `sgerion+${Date.now()}`;
    const email = `${username}@amazon.com`;
    const password = 'ABCabc123456789!';

    try {
        await createUser(username, email, password);
    } catch (err) {
        logger.error('Error while creating the user', err as Error);
        return;
    }

    let authenticatedUser;
    try {
        authenticatedUser = await authenticateUser(username, password);
    } catch (error: unknown) {
        logger.error('Error while authenticating the user', error as Error);
        return;
    }

    logger.info('Authenticated user', { data: authenticatedUser });

    const response = await fetch("https://di82qpttzbiua.cloudfront.net/api/get-presigned-url?type=image%2Fpng", {
        headers: {
            accept: "application/json",
            authorization: authenticatedUser.AuthenticationResult.AccessToken,
        },
        method: "GET"
    });
    const preSignURL = await response.json();
    logger.info('pre-sign url', { data: preSignURL });


    const streamPipeline = promisify(pipeline);
    const getImageResponse = await fetch('https://github.githubassets.com/images/modules/logos_page/Octocat.png');
    logger.info("getImageResponse status", { data: getImageResponse.status })

    if (!getImageResponse.ok) {
        throw new Error(`unexpected response ${response.statusText}`);
    }
    const writeLocally = await streamPipeline(response.body, createWriteStream(`/tmp/${username}.png`));
    logger.info("writeLocally", { data: writeLocally })

    const stats = await promises.stat(`/tmp/${username}.png`);
    const fileSizeInBytes = stats.size;
    logger.info("is file", { data: stats.isFile() })
    logger.info("is file", { data: stats.size })
    logger.info("is directory", { data: stats.isDirectory() })

    let readStream = createReadStream(`/tmp/${username}.png`);
    // @ts-ignore
    const uploadResponse = await fetch(preSignURL.data, {
        method: 'PUT',
        headers: {
            "content-length": fileSizeInBytes.toString(),
            "content-type": "image/png",
        },
        body: readStream
    });

    logger.info("uploadResponse status", { data: uploadResponse })

}

const handler = middy(lambdaHandler)
    .use(captureLambdaHandler(tracer))
    .use(injectLambdaContext(logger, { logEvent: true }));

export { handler };