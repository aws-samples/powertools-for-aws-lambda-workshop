import { StackProps, Stack, RemovalPolicy } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as cdk from 'aws-cdk-lib';
import { NagSuppressions } from 'cdk-nag';
import {
  commonFunctionSettings,
  commonBundlingSettings,
  commonEnvVars,
  dynamoFilesTableName,
  environment,
  landingZoneBucketNamePrefix,
} from '../constants';

interface FunctionsConstructProps extends StackProps {}

export class FunctionsConstruct extends Construct {
  public readonly thumbnailGeneratorFn: lambda.Function;

  public constructor(
    scope: Construct,
    id: string,
    props: FunctionsConstructProps
  ) {
    super(scope, id);

    const localEnvVars = {
      ...commonEnvVars,
      AWS_ACCOUNT_ID: Stack.of(this).account,
      TABLE_NAME_FILES: dynamoFilesTableName,
      BUCKET_NAME_FILES: `${landingZoneBucketNamePrefix}-${
        Stack.of(this).account
      }-${environment}`,
    };

    // The code that defines your stack goes here
    this.thumbnailGeneratorFn = new lambda.Function(this, 'thumbnail-generator', {
      functionName: `thumbnail-generator-${environment}`,
      runtime: lambda.Runtime.DOTNET_6,
      environment: {
        ...localEnvVars,
      },
      code: lambda.Code.fromAsset('../functions/dotnet/', {
        bundling: {
          image: lambda.Runtime.DOTNET_6.bundlingImage,
          user: 'root',
          outputType: cdk.BundlingOutput.ARCHIVED,
          command: [
            '/bin/sh', '-c',
            ' dotnet tool install -g Amazon.Lambda.Tools' +
            ' && dotnet build' +
            ' && dotnet lambda package --output-package /asset-output/function.zip'
          ],
        },
      }),
      handler: 'PowertoolsWorkshop::PowertoolsWorkshop.ThumbnailGeneratorFunction::FunctionHandler',
      timeout: cdk.Duration.seconds(30),
      memorySize: 256
    });

    NagSuppressions.addResourceSuppressions(
      this.thumbnailGeneratorFn,
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
