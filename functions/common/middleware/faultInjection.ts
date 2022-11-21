import type middy from '@middy/core';
import type { Logger } from '@aws-lambda-powertools/logger';
import type { Tracer } from '@aws-lambda-powertools/tracer';
import {
  latencyFailure,
  exceptionFailure,
  diskSpaceFailure,
  statusCodeFailure,
  denyListFailure,
  memoryFailure,
  timeoutFailure,
} from '../fault-injection/failures';
import { getSettings } from '../fault-injection/utils';

interface Options {
  logger: Logger
  tracer: Tracer
}

const faultInjection = ({ logger, tracer }: Options): middy.MiddlewareObj => {
  let mitmHandler: any;

  const clearMitm = () => {
    if (mitmHandler) mitmHandler.disable();
  };

  const requestHandler = async (): Promise<void> => {
    const settings = await getSettings(tracer);
    const {
      isEnabled,
      rate,
      failureMode,
      minLatency,
      maxLatency,
      exceptionMsg,
      statusCode,
      diskSpace,
      denylist,
    } = settings;

    if (!isEnabled || failureMode !== 'denylist') {
      clearMitm();
    }

    if (isEnabled && Math.random() < rate) {
      if (failureMode === 'latency') {
        const latency = await latencyFailure(minLatency, maxLatency);
        logger.info(`Injecting latency`, { details: latency });
      } else if (failureMode === 'exception') {
        logger.info(`Injecting exception`, { details: exceptionMsg });
        exceptionFailure(exceptionMsg);
      } else if (failureMode === 'statusCode') {
        logger.info(`Injecting status code response`, { details: statusCode });
        statusCodeFailure(statusCode);
      } else if (failureMode === 'diskSpace') {
        logger.info(`Injecting disk space failure`, { details: diskSpace });
        diskSpaceFailure(diskSpace);
      } else if (failureMode === 'denylist') {
        logger.info(
          `Injecting dependency failure through a network block for denylisted sites`,
          { details: denylist }
        );
        denyListFailure(denylist, mitmHandler);
      } else if (failureMode === 'memory') {
        logger.info(`Injecting memory failure`);
        memoryFailure();
      } else if (failureMode === 'timeout') {
        logger.info(`Injecting timeout failure`);
        await timeoutFailure();
      }
    }
  };

  return {
    before: requestHandler,
  };
};

export { faultInjection };
