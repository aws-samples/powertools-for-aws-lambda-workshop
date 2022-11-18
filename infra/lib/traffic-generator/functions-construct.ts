import { StackProps, Duration, Stack } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import {
  commonFunctionSettings,
  commonBundlingSettings,
  commonEnvVars,
  environment,
  trafficGeneratorIntervalInMinutes,
} from '../constants';

type FunctionsConstructProps = StackProps;

export class FunctionsConstruct extends Construct {
  public readonly usersGeneratorFn: NodejsFunction;
  public readonly trafficGeneratorFn: NodejsFunction;

  constructor(scope: Construct, id: string, props: FunctionsConstructProps) {
    super(scope, id);

    const localEnvVars = {
      ...commonEnvVars,
      DUMMY_PASSWORD: 'ABCabc123456789!',
      AWS_ACCOUNT_ID: Stack.of(this).account,
    };

    this.usersGeneratorFn = new NodejsFunction(this, 'users-generator', {
      ...commonFunctionSettings,
      entry: '../functions/users-generator.ts',
      functionName: `users-generator-${environment}`,
      timeout: Duration.seconds(60),
      environment: {
        ...localEnvVars,
        // COGNITO_USER_POOL_CLIENT_ID - added at deploy time
      },
      bundling: { ...commonBundlingSettings },
    });

    this.trafficGeneratorFn = new NodejsFunction(this, 'traffic-generator', {
      ...commonFunctionSettings,
      entry: '../functions/traffic-generator.ts',
      functionName: `traffic-generator-${environment}`,
      environment: {
        ...localEnvVars,
        // COGNITO_USER_POOL_ID - added at deploy time
        // COGNITO_USER_POOL_CLIENT_ID - added at deploy time
        // API_URL - added at deploy time
      },
      timeout: Duration.seconds(900),
      bundling: { ...commonBundlingSettings },
    });
  }
}
