import { StackProps, Duration, Stack } from "aws-cdk-lib";
import { Construct } from "constructs";
import { Tracing, Runtime, Function, Code } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import {
  dynamoFilesTableName,
  dynamoFilesGsiName,
  powertoolsServiceName,
  powertoolsLoggerLogLevel,
  powertoolsLoggerSampleRate,
  powertoolsMetricsNamespace,
  environment,
} from "./constants";

interface FunctionsConstructProps extends StackProps {
  bucketName: string;
}

export class FunctionsConstruct extends Construct {
  public readonly preSignUpCognitoTriggerFn: Function;
  public readonly getPresignedUrlFn: NodejsFunction;
  public readonly markCompleteUploadFn: NodejsFunction;

  constructor(scope: Construct, id: string, props: FunctionsConstructProps) {
    super(scope, id);

    const { bucketName } = props;

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

    this.preSignUpCognitoTriggerFn = new Function(
      this,
      "pre-signup-cognito-trigger",
      {
        ...sharedSettings,
        code: Code.fromInline(
          `exports.handler = (event, _context, callback) => {event.response.autoConfirmUser=true;event.response.autoVerifyEmail=true;callback(null, event);};`
        ),
        handler: "index.handler",
      }
    );

    this.getPresignedUrlFn = new NodejsFunction(this, "get-presigned-url", {
      entry: "lib/fns/get-presigned-url.ts",
      ...sharedSettings,
      environment: {
        TABLE_NAME_FILES: dynamoFilesTableName,
        BUCKET_NAME_FILES: bucketName,
        // UPLOADED_FILES_INDEX_NAME: dynamoFilesGsiName,
        ...commonEnvVars,
      },
    });

    this.markCompleteUploadFn = new NodejsFunction(
      this,
      "mark-complete-upload",
      {
        entry: "lib/fns/mark-complete-upload.ts",
        ...sharedSettings,
        environment: {
          TABLE_NAME_FILES: dynamoFilesTableName,
          ...commonEnvVars,
        },
      }
    );
  }
}
