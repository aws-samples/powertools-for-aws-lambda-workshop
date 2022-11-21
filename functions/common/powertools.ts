import { Logger } from '@aws-lambda-powertools/logger';
import { Metrics } from '@aws-lambda-powertools/metrics';
import { Tracer } from '@aws-lambda-powertools/tracer';

const awsLambdaPowertoolsVersion = '1.4.0';

const defaultValues = {
  awsAccountId: process.env.AWS_ACCOUNT_ID || 'N/A',
  environment: process.env.ENVIRONMENT || 'N/A',
};

const logger = new Logger({
  persistentLogAttributes: {
    ...defaultValues,
    logger: {
      name: '@aws-lambda-powertools/logger',
      version: awsLambdaPowertoolsVersion,
    },
  },
});

const metrics = new Metrics({
  defaultDimensions: {
    ...defaultValues,
    commitHash: 'abcdefg12',
    appName: 'media-processing-application',
    awsRegion: process.env.AWS_REGION || 'N/A',
    appVersion: 'v0.0.1',
    runtime: process.env.AWS_EXECUTION_ENV || 'N/A',
  },
});

const tracer = new Tracer();

export { logger, metrics, tracer };
