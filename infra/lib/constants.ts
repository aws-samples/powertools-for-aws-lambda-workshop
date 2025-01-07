import { BundlingOptions, BundlingOutput, Duration } from 'aws-cdk-lib';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Runtime, Tracing, FunctionProps } from 'aws-cdk-lib/aws-lambda';
import { BundlingOptions as NodeBundlingOptions } from 'aws-cdk-lib/aws-lambda-nodejs';
import os from 'os';

export const environment =
  process.env.NODE_ENV === 'production' ? 'prod' : 'dev';

export const dynamoFilesTableName = `media-processing-app-files-${environment}`;
export const dynamoFilesByUserGsiName = 'filesByUserIndex';

export const websiteBucketNamePrefix = 'website';
export const landingZoneBucketNamePrefix = 'media-files';

export const powertoolsServiceName = 'media-processing-app';
export const powertoolsLoggerLogLevel =
  process.env.NODE_ENV === 'production' ? 'WARN' : 'DEBUG';
export const powertoolsLoggerSampleRate =
  process.env.NODE_ENV === 'production' ? '0.1' : '1';
export const powertoolsMetricsNamespace = 'AnyCompany'; // Dummy company name

export const trafficGeneratorIntervalInMinutes = 1;

export const commonFunctionSettings: Partial<FunctionProps> = {
  runtime: Runtime.NODEJS_22_X,
  tracing: Tracing.ACTIVE,
  logRetention: RetentionDays.FIVE_DAYS,
  timeout: Duration.seconds(30),
  handler: 'handler',
  memorySize: 256,
};

export const commonNodeJsBundlingSettings: Partial<NodeBundlingOptions> = {
  minify: true,
  sourceMap: true,
  externalModules: ['@aws-sdk/*'],
  mainFields: ['module', 'main'],
  esbuildArgs: {
    '--tree-shaking': true,
  },
  metafile: true,
};

export const commonJavaFunctionSettings: Partial<FunctionProps> = {
  runtime: Runtime.JAVA_21,
  tracing: Tracing.ACTIVE,
  logRetention: RetentionDays.FIVE_DAYS,
  timeout: Duration.seconds(30),
  memorySize: 512,
};

export const commonJavaBundlingSettings: BundlingOptions = {
  image: Runtime.JAVA_21.bundlingImage,
  command: [
    '/bin/sh',
    '-c',
    'mvn package && cp /asset-input/target/function.jar /asset-output/',
  ],
  user: 'root',
  outputType: BundlingOutput.ARCHIVED,
  volumes: [
    {
      hostPath: `${os.homedir()}/.m2'`,
      containerPath: '/root/.m2/',
    },
  ],
};

export const commonDotnetBundlingSettings: BundlingOptions = {
  image: Runtime.DOTNET_8.bundlingImage,
  user: 'root',
  outputType: BundlingOutput.ARCHIVED,
  command: [
    '/bin/sh',
    '-c',
    ' dotnet tool install -g Amazon.Lambda.Tools' +
    ' && dotnet build' +
    ' && dotnet lambda package --output-package /asset-output/function.zip',
  ],
};

export const commonEnvVars = {
  ENVIRONMENT: environment,
  // Powertools environment variables
  POWERTOOLS_SERVICE_NAME: powertoolsServiceName,
  POWERTOOLS_LOGGER_LOG_LEVEL: powertoolsLoggerLogLevel,
  POWERTOOLS_LOGGER_SAMPLE_RATE: powertoolsLoggerSampleRate,
  POWERTOOLS_LOGGER_LOG_EVENT: 'TRUE',
  POWERTOOLS_METRICS_NAMESPACE: powertoolsMetricsNamespace,
  NODE_OPTIONS: '--enable-source-maps',
};

const Language = {
  NodeJS: 'nodejs',
  DotNet: 'dotnet',
  Python: 'python',
  Java: 'java',
} as const;

export type Language = (typeof Language)[keyof typeof Language];
