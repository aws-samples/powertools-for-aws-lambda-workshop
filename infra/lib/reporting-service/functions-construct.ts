import { StackProps, Stack } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { NagSuppressions } from 'cdk-nag';
import {
  commonFunctionSettings,
  commonBundlingSettings,
  commonEnvVars,
  environment,
} from '../constants';

interface FunctionsConstructProps extends StackProps {}

export class FunctionsConstruct extends Construct {
  public readonly apiEndpointHandlerFn: NodejsFunction;

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

    this.apiEndpointHandlerFn = new NodejsFunction(
      this,
      'api-endpoint-handler',
      {
        ...commonFunctionSettings,
        entry: '../functions/typescript/modules/module3/index.ts',
        functionName: `api-endpoint-handler-${environment}`,
        environment: {
          ...localEnvVars,
        },
        bundling: {
          ...commonBundlingSettings,
        },
      }
    );

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
