import { StackProps, Stack } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { NagSuppressions } from 'cdk-nag';
import {
  commonFunctionSettings,
  commonJavaFunctionSettings,
  commonNodeJsBundlingSettings,
  commonJavaBundlingSettings,
  commonDotnetBundlingSettings,
  commonEnvVars,
  dynamoFilesTableName,
  environment,
  powertoolsLoggerLogLevel,
  type Language,
} from '../constants.js';
import { Function, Code, Runtime } from 'aws-cdk-lib/aws-lambda';
import { PythonFunction } from '@aws-cdk/aws-lambda-python-alpha';

interface FunctionsConstructProps extends StackProps {
  landingZoneBucketName: string;
  language: Language;
}

export class FunctionsConstruct extends Construct {
  public readonly imageDetectionFn: Function;

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
      BUCKET_NAME_FILES: props.landingZoneBucketName,
    };
    const functionName = `image-detection-${environment}`;
    const resourcePhysicalId = `image-detection`;

    if (language === 'nodejs') {
      this.imageDetectionFn = new NodejsFunction(this, resourcePhysicalId, {
        ...commonFunctionSettings,
        entry: '../functions/typescript/modules/module2/index.ts',
        functionName,
        environment: {
          ...localEnvVars,
        },
        bundling: {
          ...commonNodeJsBundlingSettings,
        },
      });
    } else if (language === 'python') {
      this.imageDetectionFn = new PythonFunction(this, resourcePhysicalId, {
        ...commonFunctionSettings,
        entry: '../functions/python/modules/module2/',
        functionName,
        index: 'app.py',
        runtime: Runtime.PYTHON_3_12,
        handler: 'lambda_handler',
        environment: {
          ...localEnvVars,
        },
      });
    } else if (language === 'java') {
      this.imageDetectionFn = new Function(this, resourcePhysicalId, {
        ...commonJavaFunctionSettings,
        functionName,
        runtime: Runtime.JAVA_21,
        environment: {
          ...localEnvVars,
          POWERTOOLS_LOG_LEVEL: powertoolsLoggerLogLevel, // different from typescript
        },
        code: Code.fromAsset('../functions/java/modules/module2/', {
          bundling: {
            ...commonJavaBundlingSettings,
          },
        }),
        handler: 'com.amazonaws.powertools.workshop.Module2Handler',
      });
    } else if (language === 'dotnet') {
      this.imageDetectionFn = new Function(this, resourcePhysicalId, {
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
          'PowertoolsWorkshop::PowertoolsWorkshop.ImageDetectionFunction::FunctionHandler',
      });
    } else {
      throw new Error(`Language ${language} not supported`);
    }

    NagSuppressions.addResourceSuppressions(
      this.imageDetectionFn,
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
