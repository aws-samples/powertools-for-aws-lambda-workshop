import { StackProps, Stack } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Function, Runtime, Code } from 'aws-cdk-lib/aws-lambda';
import { PythonFunction } from '@aws-cdk/aws-lambda-python-alpha'
import { NagSuppressions } from 'cdk-nag';
import {
  commonFunctionSettings,
  commonNodeJsBundlingSettings,
  commonJavaFunctionSettings,
  commonJavaBundlingSettings,
  commonDotnetBundlingSettings,
  commonEnvVars,
  environment,
  powertoolsLoggerLogLevel,
  type Language,
} from '../constants.js';

interface FunctionsConstructProps extends StackProps {
  language: Language;
}

export class FunctionsConstruct extends Construct {
  public readonly apiEndpointHandlerFn: NodejsFunction;

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
    };
    const functionName = `api-endpoint-handler-${environment}`;
    const resourcePhysicalId = `api-endpoint-handler`;

    if (language === 'nodejs') {
      this.apiEndpointHandlerFn = new NodejsFunction(this, resourcePhysicalId, {
        ...commonFunctionSettings,
        functionName,
        entry: '../functions/typescript/modules/module3/index.ts',
        environment: {
          ...localEnvVars,
        },
        bundling: {
          ...commonNodeJsBundlingSettings,
        },
      });
    } else if (language === 'python') {
      this.apiEndpointHandlerFn = new PythonFunction(this, resourcePhysicalId, {
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
      this.apiEndpointHandlerFn = new Function(this, resourcePhysicalId, {
        ...commonJavaFunctionSettings,
        functionName,
        runtime: Runtime.JAVA_21,
        environment: {
          ...localEnvVars,
          POWERTOOLS_LOG_LEVEL: powertoolsLoggerLogLevel, // different from typescript
        },
        code: Code.fromAsset('../functions/java/modules/module3/', {
          bundling: {
            ...commonJavaBundlingSettings,
          },
        }),
        handler: 'com.amazonaws.powertools.workshop.Module3Handler',
      });
    } else if (language === 'dotnet') {
      this.apiEndpointHandlerFn = new Function(this, resourcePhysicalId, {
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
          'PowertoolsWorkshop::PowertoolsWorkshop.ApiEndpointHandlerFunction::FunctionHandler',
      });
    } else {
      throw new Error(`Language ${language} not supported`);
    }

    NagSuppressions.addResourceSuppressions(
      this.apiEndpointHandlerFn,
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
