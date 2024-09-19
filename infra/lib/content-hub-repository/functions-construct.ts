import { StackProps, Stack } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { NagSuppressions } from 'cdk-nag';
import {
  dynamoFilesTableName,
  dynamoFilesByUserGsiName,
  commonFunctionSettings,
  commonNodeJsBundlingSettings,
  commonEnvVars,
  environment,
  landingZoneBucketNamePrefix,
} from '../constants.js';

interface FunctionsConstructProps extends StackProps {}

export class FunctionsConstruct extends Construct {
  public readonly getPresignedDownloadUrlFn: NodejsFunction;
  public readonly getPresignedUploadUrlFn: NodejsFunction;
  public readonly markCompleteUploadFn: NodejsFunction;
  public readonly cleanDeletedFilesFn: NodejsFunction;

  public constructor(
    scope: Construct,
    id: string,
    _props: FunctionsConstructProps
  ) {
    super(scope, id);

    const localEnvVars = {
      ...commonEnvVars,
      AWS_ACCOUNT_ID: Stack.of(this).account,
    };

    const filesBucketName = `${landingZoneBucketNamePrefix}-${
      Stack.of(this).account
    }-${environment}`;

    this.getPresignedUploadUrlFn = new NodejsFunction(
      this,
      'get-presigned-upload-url',
      {
        ...commonFunctionSettings,
        entry: '../functions/typescript/api/get-presigned-upload-url/index.ts',
        functionName: `get-presigned-upload-url-${environment}`,
        environment: {
          ...localEnvVars,
          TABLE_NAME_FILES: dynamoFilesTableName,
          BUCKET_NAME_FILES: filesBucketName,
        },
        bundling: { ...commonNodeJsBundlingSettings },
      }
    );

    NagSuppressions.addResourceSuppressions(
      this.getPresignedUploadUrlFn,
      [
        {
          id: 'AwsSolutions-IAM4',
          reason:
            'Intentionally using AWSLambdaBasicExecutionRole managed policy.',
        },
        {
          id: 'AwsSolutions-IAM5',
          reason:
            'Wildcard needed to allow access to X-Ray and CloudWatch streams.',
        },
      ],
      true
    );

    this.getPresignedDownloadUrlFn = new NodejsFunction(
      this,
      'get-presigned-download-url',
      {
        ...commonFunctionSettings,
        entry:
          '../functions/typescript/api/get-presigned-download-url/index.ts',
        functionName: `get-presigned-download-url-${environment}`,
        environment: {
          ...localEnvVars,
          TABLE_NAME_FILES: dynamoFilesTableName,
          INDEX_NAME_FILES_BY_USER: dynamoFilesByUserGsiName,
          BUCKET_NAME_FILES: filesBucketName,
        },
        bundling: { ...commonNodeJsBundlingSettings },
      }
    );

    NagSuppressions.addResourceSuppressions(
      this.getPresignedDownloadUrlFn,
      [
        {
          id: 'AwsSolutions-IAM4',
          reason:
            'Intentionally using AWSLambdaBasicExecutionRole managed policy.',
        },
        {
          id: 'AwsSolutions-IAM5',
          reason:
            'Wildcard needed to allow access to X-Ray and CloudWatch streams.',
        },
      ],
      true
    );

    this.markCompleteUploadFn = new NodejsFunction(this, 'mark-file-queued', {
      ...commonFunctionSettings,
      entry: '../functions/typescript/api/mark-file-queued/index.ts',
      functionName: `mark-file-queued-${environment}`,
      environment: {
        ...localEnvVars,
        TABLE_NAME_FILES: dynamoFilesTableName,
      },
      bundling: { ...commonNodeJsBundlingSettings },
    });

    NagSuppressions.addResourceSuppressions(
      this.markCompleteUploadFn,
      [
        {
          id: 'AwsSolutions-IAM4',
          reason:
            'Intentionally using AWSLambdaBasicExecutionRole managed policy.',
        },
        {
          id: 'AwsSolutions-IAM5',
          reason:
            'Wildcard needed to allow access to X-Ray and CloudWatch streams.',
        },
      ],
      true
    );

    this.cleanDeletedFilesFn = new NodejsFunction(this, 'clean-deleted-files', {
      ...commonFunctionSettings,
      entry: '../functions/typescript/api/clean-deleted-files/index.ts',
      functionName: `clean-deleted-files-${environment}`,
      environment: {
        ...localEnvVars,
        TABLE_NAME_FILES: dynamoFilesTableName,
      },
      bundling: { ...commonNodeJsBundlingSettings },
    });

    NagSuppressions.addResourceSuppressions(
      this.cleanDeletedFilesFn,
      [
        {
          id: 'AwsSolutions-IAM4',
          reason:
            'Intentionally using AWSLambdaBasicExecutionRole managed policy.',
        },
        {
          id: 'AwsSolutions-IAM5',
          reason:
            'Wildcard needed to allow access to X-Ray and CloudWatch streams.',
        },
      ],
      true
    );
  }
}
