import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { NagSuppressions } from 'cdk-nag';
import {
  commonFunctionSettings,
  commonBundlingSettings,
  commonEnvVars,
  environment,
} from '../constants';

export class FunctionsConstruct extends Construct {
  public readonly preSignUpCognitoTriggerFn: NodejsFunction;

  public constructor(scope: Construct, id: string, _props: StackProps) {
    super(scope, id);

    const localEnvVars = {
      ...commonEnvVars,
      AWS_ACCOUNT_ID: Stack.of(this).account,
    };

    this.preSignUpCognitoTriggerFn = new NodejsFunction(
      this,
      'pre-signup-cognito-trigger',
      {
        ...commonFunctionSettings,
        functionName: `pre-signup-cognito-trigger-${environment}`,
        entry: '../functions/pre-signup-cognito-trigger.ts',
        environment: {
          ...localEnvVars,
        },
        bundling: {
          ...commonBundlingSettings,
        },
      }
    );

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    NagSuppressions.addResourceSuppressions(this.preSignUpCognitoTriggerFn.role!, [
      {
        id: 'AwsSolutions-IAM4',
        reason:
          'Intentionally using an AWS managed policy for AWS Lambda - AWSLambdaBasicExecutionRole"',
      },
    ]);

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    NagSuppressions.addResourceSuppressions(this.preSignUpCognitoTriggerFn.role!, [
      {
        id: 'AwsSolutions-IAM5',
        reason:
          'Active tracing requires a wildcard permission in order to send trace data in X-Ray',
      },
    ], true);
  }
}
