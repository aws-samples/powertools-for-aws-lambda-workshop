import { Period, RestApi } from 'aws-cdk-lib/aws-apigateway';
import { Secret } from 'aws-cdk-lib/aws-secretsmanager';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';
import type { StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { environment } from '../constants';
import { NagSuppressions } from 'cdk-nag';

interface ApiConstructProps extends StackProps {}

export class ApiConstruct extends Construct {
  public readonly restApi: RestApi;
  public readonly apiKeySecret: Secret;
  public readonly apiUrlParameter: StringParameter;

  public constructor(scope: Construct, id: string, _props: ApiConstructProps) {
    super(scope, id);

    this.restApi = new RestApi(this, 'rest-api', {
      defaultCorsPreflightOptions: {
        allowOrigins: ['*'],
        allowMethods: ['GET', 'POST', 'OPTIONS'],
        allowHeaders: ['*'],
      },
    });

    this.apiKeySecret = new Secret(this, 'api-key-value', {
      secretName: `/${environment}/reporting-service/api-key`,
      generateSecretString: {
        excludeCharacters: ' %+~`#$&*()|[]{}:;<>?!\'/@"\\',
      },
    });

    this.apiUrlParameter = new StringParameter(this, 'api-url-parameter', {
      parameterName: `/${environment}/reporting-service/api-url`,
      stringValue: JSON.stringify({ url: this.restApi.url }),
    });

    const key = this.restApi.addApiKey('api-key', {
      value: this.apiKeySecret.secretValue.unsafeUnwrap(),
    });
    const plan = this.restApi.addUsagePlan('usage-plan', {
      name: 'usage-plan',
      quota: {
        limit: 5000,
        period: Period.MONTH,
      },
      throttle: {
        burstLimit: 1000,
        rateLimit: 500,
      },
      apiStages: [
        {
          stage: this.restApi.deploymentStage,
          api: this.restApi,
        },
      ],
    });
    plan.addApiKey(key);

    NagSuppressions.addResourceSuppressions(
      this.restApi,
      [
        {
          id: 'AwsSolutions-APIG2',
          reason: 'Request validation is handled in the Proxy Lambda Function.',
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
