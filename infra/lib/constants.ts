import { Duration } from "aws-cdk-lib";
import { RetentionDays } from "aws-cdk-lib/aws-logs";
import { Runtime, Tracing, FunctionProps } from "aws-cdk-lib/aws-lambda";
import { BundlingOptions } from "aws-cdk-lib/aws-lambda-nodejs";

export const dynamoFilesTableName = "FilesTable";
export const dynamoFilesByUserGsiName = "filesByUserIndex";

export const websiteBucketNamePrefix = "website";
export const landingZoneBucketNamePrefix = "landing-zone";

export const environment =
  process.env.NODE_ENV === "production" ? "prod" : "dev";

export const powertoolsServiceName =
  "aws-lambda-powertools-typescript-workshop";
export const powertoolsLoggerLogLevel =
  process.env.NODE_ENV === "production" ? "WARN" : "DEBUG";
export const powertoolsLoggerSampleRate =
  process.env.NODE_ENV === "production" ? "0.1" : "1";
export const powertoolsMetricsNamespace = "octank"; // Dummy company name

export const trafficGeneratorIntervalInMinutes = 1;

export const commonFunctionSettings: Partial<FunctionProps> = {
  runtime: Runtime.NODEJS_16_X,
  tracing: Tracing.ACTIVE,
  logRetention: RetentionDays.FIVE_DAYS,
  timeout: Duration.seconds(30),
  handler: "handler",
  memorySize: 256,
};

export const commonBundlingSettings: Partial<BundlingOptions> = {
  minify: true,
  sourceMap: true,
};

export const commonEnvVars = {
  ENVIRONMENT: environment,
  // Powertools environment variables
  POWERTOOLS_SERVICE_NAME: powertoolsServiceName,
  POWERTOOLS_LOGGER_LOG_LEVEL: powertoolsLoggerLogLevel,
  POWERTOOLS_LOGGER_SAMPLE_RATE: powertoolsLoggerSampleRate,
  POWERTOOLS_METRICS_NAMESPACE: powertoolsMetricsNamespace,
  NODE_OPTIONS: '--enable-source-maps'
};
