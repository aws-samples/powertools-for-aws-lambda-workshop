import { type StackProps, CfnOutput, CustomResource, Duration, RemovalPolicy, Token } from 'aws-cdk-lib';
import { Provider } from 'aws-cdk-lib/custom-resources';
import { Construct } from 'constructs';
import { Runtime, Function as LambdaFunction, Code } from 'aws-cdk-lib/aws-lambda';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { NagSuppressions } from 'cdk-nag';

interface RandomPasswordConstructProps extends StackProps {}

export class RandomPasswordConstruct extends Construct {
  public readonly randomPassword: string;

  public constructor(
    scope: Construct,
    id: string,
    _props: RandomPasswordConstructProps
  ) {
    super(scope, id);

    const resourcePrefix = 'rand-pass';
    const randomPasswordGeneratorProvider = new Provider(
      this,
      `${resourcePrefix}-provider`,
      {
        onEventHandler: new LambdaFunction(this, `${resourcePrefix}-fn`, {
          runtime: Runtime.NODEJS_22_X,
          handler: 'index.handler',
          logGroup: new LogGroup(this, `${resourcePrefix}-fn-log`, {
            removalPolicy: RemovalPolicy.DESTROY,
            retention: RetentionDays.ONE_DAY,
          }),
          timeout: Duration.seconds(10),
          code: Code.fromInline(`const { randomUUID } = require('crypto');
          exports.handler = async () => {
            return {
              Data: { RandomPassword: randomUUID() },
            };
          };`),
        }),
        logGroup: new LogGroup(this, `${resourcePrefix}-provider-log`, {
          removalPolicy: RemovalPolicy.DESTROY,
          retention: RetentionDays.ONE_DAY,
        }),
      }
    );

    const randomPaswordGenerator = new CustomResource(
      this,
      'Custom:RandomPasswordForIDE',
      {
        serviceToken: randomPasswordGeneratorProvider.serviceToken,
      }
    );

    this.randomPassword = Token.asString(
      randomPaswordGenerator.getAtt('RandomPassword')
    );

    new CfnOutput(this, 'RandomPassword', {
      value: this.randomPassword,
      description: 'Password for VSCode Web IDE',
    })

    NagSuppressions.addResourceSuppressions(
      this,
      [
        {
          id: 'AwsSolutions-IAM5',
          reason:
            'This resource is managed by CDK and used to create custom resources. This is run only a handful of times during deployment.',
        },
        {
          id: 'AwsSolutions-IAM4',
          reason:
            'This resource is managed by CDK and used to create custom resources. This is run only a handful of times during deployment.',
        },
        {
          id: 'AwsSolutions-L1',
          reason:
            'This resource is managed by CDK and used to create custom resources. This is run only a handful of times during deployment.',
        },
      ],
      true
    );
  }
}
