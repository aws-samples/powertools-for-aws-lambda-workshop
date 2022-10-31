import { logger, tracer } from "./common/powertools";
import middy from "@middy/core";
import { injectLambdaContext } from "@aws-lambda-powertools/logger";
import { captureLambdaHandler } from "@aws-lambda-powertools/tracer";

import { APIGatewayProxyEventBase, Context } from "aws-lambda"
import { CognitoIdentityProviderClient, SignUpCommand, AdminInitiateAuthCommand } from "@aws-sdk/client-cognito-identity-provider";
import fetch from "node-fetch";
import { createReadStream, promises } from 'node:fs';
import * as imagemagick from 'imagemagick';

const pickOneOf = (array: string[] | number[]) => {
    return Math.floor(Math.random() * array.length);
}

const generateDummyImage = (filename: string) => {
    const values = {
        background_color: "#FFFFF",
        file_extension: pickOneOf(['png', 'jpg']),
        file_location: '/tmp',
        file_name: filename,
        gravity: 'center',
        height: [200, 400, 600],
        point_size: 30,
        resolution: 72,
        size: 512,
        sampling_factor: 3,
        text_color: "#000000",
        text_to_display: 'Test image',
        width: [200, 400, 600]
    }

    const params = [
        "-density", `${values.resolution * values.sampling_factor}`,
        "-size", `${values.size * values.sampling_factor}x${values.size * values.sampling_factor}`,
        `canvas:${values.background_color}`,
        "-fill", values.text_color,
        "-pointsize", `${values.point_size}`,
        "-gravity", `${values.gravity}`,
        "-annotate", "+0+0",
        `${values.text_to_display}`,
        "-resample", `${values.resolution}`,
        `${values.file_location}/${values.file_name}.${values.file_extension}`
    ];

    return new Promise((resolve, reject) => {
        imagemagick.convert(
            params, (err, data) => {
                if (err) {
                    reject(err)
                }
                resolve(data);
            });
    })
}

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

const simulateTrafficOfSingleUser = async () => {
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

    const dummyImage = await generateDummyImage(username);
    logger.info("generateDummyImage results", { data: dummyImage })

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

const lambdaHandler = async (event: APIGatewayProxyEventBase<any>, context: Context): Promise<void> => {
    await simulateTrafficOfSingleUser();
}

const handler = middy(lambdaHandler)
    .use(captureLambdaHandler(tracer))
    .use(injectLambdaContext(logger, { logEvent: true }));

export { handler };