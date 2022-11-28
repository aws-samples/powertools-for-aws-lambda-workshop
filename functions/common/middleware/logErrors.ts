import type middy from '@middy/core';
import { logger } from "../powertools";

const logErrors = (): middy.MiddlewareObj => {

    const logErrors = (request: middy.Request): void => {
        if (request.error) {
            logger.error('Unexpected error occurred during Lambda invocation', { error: request.error as Error });
        }
    };

    return {
        onError: logErrors,
    };
};

export { logErrors };
