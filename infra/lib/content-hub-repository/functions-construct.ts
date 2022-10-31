import { StackProps, Stack } from "aws-cdk-lib";
import { Construct } from "constructs";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import {
  dynamoFilesTableName,
  commonFunctionSettings,
  commonBundlingSettings,
  commonEnvVars,
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

    const localEnvVars = {
      ...commonEnvVars,
      AWS_ACCOUNT_ID: Stack.of(this).account,
    };

    this.getPresignedUrlFn = new NodejsFunction(this, "get-presigned-url", {
      ...commonFunctionSettings,
      entry: "../functions/get-presigned-url.ts",
      functionName: `get-presigned-url-${environment}`,
      environment: {
        ...localEnvVars,
        TABLE_NAME_FILES: dynamoFilesTableName,
        BUCKET_NAME_FILES: props.landingZoneBucketName,
      },
      bundling: { ...commonBundlingSettings },
    });

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
