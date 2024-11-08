import { StackProps, Stack } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Function, Code, Runtime } from 'aws-cdk-lib/aws-lambda';
import { PythonFunction } from '@aws-cdk/aws-lambda-python-alpha';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { NagSuppressions } from 'cdk-nag';
import {
  commonFunctionSettings,
  commonJavaFunctionSettings,
  commonNodeJsBundlingSettings,
  commonDotnetBundlingSettings,
  commonJavaBundlingSettings,
  commonEnvVars,
  dynamoFilesTableName,
  environment,
  landingZoneBucketNamePrefix,
  powertoolsLoggerLogLevel,
  type Language,
} from '../constants.js';

interface FunctionsConstructProps extends StackProps {
  language: Language;
}

export class FunctionsConstruct extends Construct {
  public readonly thumbnailGeneratorFn: Function;

  public constructor(
    scope: Construct,
    id: string,
    props: FunctionsConstructProps
  ) {
    super(scope, id);

    const { language } = props;

    const localEnvVars = {
      ...commonEnvVars,
      AWS_ACCOUNT_ID: Stack.of(this).account,
      TABLE_NAME_FILES: dynamoFilesTableName,
      BUCKET_NAME_FILES: `${landingZoneBucketNamePrefix}-${
        Stack.of(this).account
        }-${environment}`,
    };
    const functionName = `thumbnail-generator-${environment}`;
    const resourcePhysicalId = `thumbnail-generator`;

    if (language === 'nodejs') {
      this.thumbnailGeneratorFn = new NodejsFunction(this, resourcePhysicalId, {
        ...commonFunctionSettings,
        functionName,
        entry: '../functions/typescript/modules/module1/index.ts',
        environment: {
          ...localEnvVars,
        },
        bundling: {
          ...commonNodeJsBundlingSettings,
        },
      });
    } else if (language === 'python') {
      this.thumbnailGeneratorFn = new PythonFunction(this, resourcePhysicalId, {
        ...commonFunctionSettings,
        entry: '../functions/python/modules/module1/',
        functionName,
        index: 'app.py',
        runtime: Runtime.PYTHON_3_12,
        handler: 'lambda_handler',
        environment: {
          ...localEnvVars,
        },
      });
    } else if (language === 'java') {
      this.thumbnailGeneratorFn = new Function(this, resourcePhysicalId, {
        ...commonJavaFunctionSettings,
        functionName,
        runtime: Runtime.JAVA_21,
        environment: {
          ...localEnvVars,
          POWERTOOLS_LOG_LEVEL: powertoolsLoggerLogLevel, // different from typescript
        },
        code: Code.fromAsset('../functions/java/modules/module1/', {
          bundling: {
            ...commonJavaBundlingSettings,
          },
        }),
        handler: 'com.amazonaws.powertools.workshop.Module1Handler',
      });
    } else if (language === 'dotnet') {
      this.thumbnailGeneratorFn = new Function(this, resourcePhysicalId, {
        ...commonFunctionSettings,
        functionName,
        runtime: Runtime.DOTNET_8,
        environment: {
          ...localEnvVars,
        },
        code: Code.fromAsset('../functions/dotnet/', {
          bundling: {
            ...commonDotnetBundlingSettings,
          },
        }),
        handler:
          'PowertoolsWorkshop::PowertoolsWorkshop.ThumbnailGeneratorFunction::FunctionHandler',
      });
    } else if (language === 'java') {
      throw new Error('Java not implemented yet');
    } else {
      throw new Error(`Language ${language} not supported`);
    }

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
