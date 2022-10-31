import { Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import {
  commonFunctionSettings,
  commonBundlingSettings,
  commonEnvVars,
  environment,
} from "../constants";

interface FunctionsConstructProps extends StackProps {}

export class FunctionsConstruct extends Construct {
  public readonly preSignUpCognitoTriggerFn: NodejsFunction;

  constructor(scope: Construct, id: string, props: FunctionsConstructProps) {
    super(scope, id);

    const localEnvVars = {
      ...commonEnvVars,
      AWS_ACCOUNT_ID: Stack.of(this).account,
    };

    this.preSignUpCognitoTriggerFn = new NodejsFunction(
      this,
      "pre-signup-cognito-trigger",
      {
        ...commonFunctionSettings,
        functionName: `pre-signup-cognito-trigger-${environment}`,
        entry: "../functions/pre-signup-cognito-trigger.ts",
        environment: {
          ...localEnvVars,
        },
        bundling: {
          ...commonBundlingSettings,
        },
      }
    );
  }
}
