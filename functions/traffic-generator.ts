import type { APIGatewayEvent } from "aws-lambda";
import { logger, tracer } from "./common/powertools";
import middy from "@middy/core";
import { injectLambdaContext } from "@aws-lambda-powertools/logger";
import { captureLambdaHandler } from "@aws-lambda-powertools/tracer";

const lambdaHandler = async (event: APIGatewayEvent): Promise<string> => {
    return JSON.stringify({ data: "bar" });
};

const handler = middy(lambdaHandler)
    .use(captureLambdaHandler(tracer))
    .use(injectLambdaContext(logger, { logEvent: true }));

export { handler };
