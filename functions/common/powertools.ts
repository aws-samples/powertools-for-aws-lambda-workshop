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
  defaultDimensions: defaultValues,
});

const tracer = new Tracer();

export { logger, metrics, tracer };
