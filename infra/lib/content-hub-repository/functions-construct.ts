import { StackProps, Duration, Stack } from "aws-cdk-lib";
import { Construct } from "constructs";
import { Tracing, Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import {
  dynamoFilesTableName,
  powertoolsServiceName,
  powertoolsLoggerLogLevel,
  powertoolsLoggerSampleRate,
  powertoolsMetricsNamespace,
  environment,
} from "../constants";

interface FunctionsConstructProps extends StackProps {
  landingZoneBucketName: string;
}

export class FunctionsConstruct extends Construct {
  public readonly getPresignedUrlFn: NodejsFunction;
  public readonly markCompleteUploadFn: NodejsFunction;

  constructor(scope: Construct, id: string, props: FunctionsConstructProps) {
    super(scope, id);

    const sharedSettings = {
      runtime: Runtime.NODEJS_16_X,
      tracing: Tracing.ACTIVE,
      timeout: Duration.seconds(300),
      handler: "handler",
      memorySize: 256,
    };

    const commonEnvVars = {
      ENVIRONMENT: environment,
      AWS_ACCOUNT_ID: Stack.of(this).account,
      // Powertools environment variables
      POWERTOOLS_SERVICE_NAME: powertoolsServiceName,
      POWERTOOLS_LOGGER_LOG_LEVEL: powertoolsLoggerLogLevel,
      POWERTOOLS_LOGGER_SAMPLE_RATE: powertoolsLoggerSampleRate,
      POWERTOOLS_METRICS_NAMESPACE: powertoolsMetricsNamespace,
    };

    this.getPresignedUrlFn = new NodejsFunction(this, "get-presigned-url", {
      entry: "../functions/get-presigned-url.ts",
      ...sharedSettings,
      environment: {
        TABLE_NAME_FILES: dynamoFilesTableName,
        BUCKET_NAME_FILES: props.landingZoneBucketName,
        ...commonEnvVars,
      },
    });

    this.markCompleteUploadFn = new NodejsFunction(
      this,
      "mark-complete-upload",
      {
        entry: "../functions/mark-complete-upload.ts",
        ...sharedSettings,
        environment: {
          TABLE_NAME_FILES: dynamoFilesTableName,
          ...commonEnvVars,
        },
      }
    );
  }
}
