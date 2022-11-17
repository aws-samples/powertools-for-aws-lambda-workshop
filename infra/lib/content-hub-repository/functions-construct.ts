import { StackProps, Stack, aws_ssm as ssm } from "aws-cdk-lib";
import { Construct } from "constructs";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import {
  dynamoFilesTableName,
  dynamoFilesByUserGsiName,
  commonFunctionSettings,
  commonBundlingSettings,
  commonEnvVars,
  environment,
} from "../constants";

interface FunctionsConstructProps extends StackProps {
  landingZoneBucketName: string;
}

export class FunctionsConstruct extends Construct {
  public readonly getPresignedUploadUrlFn: NodejsFunction;
  public readonly getPresignedDownloadUrlFn: NodejsFunction;
  public readonly markCompleteUploadFn: NodejsFunction;

  constructor(scope: Construct, id: string, props: FunctionsConstructProps) {
    super(scope, id);

    const localEnvVars = {
      ...commonEnvVars,
      AWS_ACCOUNT_ID: Stack.of(this).account,
    };

    const failureLambdaParameter = new ssm.StringParameter(this, `/failure-lambda/${environment}/get-presigned-upload-url`, {
            stringValue: '{"isEnabled": true, "failureMode": "denylist", "rate": 0.1, "minLatency": 100, "maxLatency": 400, "exceptionMsg": "Exception message!", "statusCode": 404, "diskSpace": 100, "denylist": ["dynamodb.*.amazonaws.com"]}',
        }
    );

    this.getPresignedUploadUrlFn = new NodejsFunction(
      this,
      "get-presigned-upload-url",
      {
        ...commonFunctionSettings,
        entry: "../functions/get-presigned-upload-url.ts",
        functionName: `get-presigned-upload-url-${environment}`,
        environment: {
          ...localEnvVars,
          TABLE_NAME_FILES: dynamoFilesTableName,
          BUCKET_NAME_FILES: props.landingZoneBucketName,
          FAILURE_INJECTION_PARAM: failureLambdaParameter.parameterName
        },
        bundling: { ...commonBundlingSettings },
      }
    );

    failureLambdaParameter.grantRead(this.getPresignedUploadUrlFn);

    this.getPresignedDownloadUrlFn = new NodejsFunction(
      this,
      "get-presigned-download-url",
      {
        ...commonFunctionSettings,
        entry: "../functions/get-presigned-download-url.ts",
        functionName: `get-presigned-download-url-${environment}`,
        environment: {
          ...localEnvVars,
          TABLE_NAME_FILES: dynamoFilesTableName,
          INDEX_NAME_FILES_BY_USER: dynamoFilesByUserGsiName,
          BUCKET_NAME_FILES: props.landingZoneBucketName,
        },
        bundling: { ...commonBundlingSettings },
      }
    );

    this.markCompleteUploadFn = new NodejsFunction(this, "mark-file-queued", {
      ...commonFunctionSettings,
      entry: "../functions/mark-file-queued.ts",
      functionName: `mark-file-queued-${environment}`,
      environment: {
        ...localEnvVars,
        TABLE_NAME_FILES: dynamoFilesTableName,
      },
      bundling: { ...commonBundlingSettings },
    });
  }
}
