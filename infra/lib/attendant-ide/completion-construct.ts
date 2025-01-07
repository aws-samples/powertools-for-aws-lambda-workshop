import { type StackProps, CustomResource, Duration } from 'aws-cdk-lib';
import { Provider } from 'aws-cdk-lib/custom-resources';
import { Construct } from 'constructs';
import { Runtime, Function, Code } from 'aws-cdk-lib/aws-lambda';
import { customSecurityHeader, customSecurityHeaderValue } from './constants.js';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { NagSuppressions } from 'cdk-nag';

interface CompletionConstructProps extends StackProps {
  /**
   * The healthcheck endpoint to check for availability.
   */
  healthCheckEndpoint: string;
}

export class CompletionConstruct extends Construct {
  public constructor(
    scope: Construct,
    id: string,
    props: CompletionConstructProps
  ) {
    super(scope, id);

    const { healthCheckEndpoint } = props;

    const isAvailableHandler = new Function(this, 'is-available', {
      runtime: Runtime.NODEJS_22_X,
      handler: 'index.handler',
      logRetention: RetentionDays.ONE_DAY,
      timeout: Duration.seconds(30),
      code: Code.fromInline(`/* global fetch */
      exports.handler = async () => {
        // make request to ide healthcheck endpoint
        // return true if 200, false otherwise
        try {
          const res = await fetch(process.env.IDE_HEALTHCHECK_ENDPOINT, {
            headers: {
              [process.env.CUSTOM_SECURITY_HEADER]:
                process.env.CUSTOM_SECURITY_HEADER_VALUE,
            },
            method: 'GET',
          });
          if (res.ok === false) {
            return { IsComplete: false };
          }
      
          return { IsComplete: true };
        } catch (err) {
          console.error(err);
      
          return { IsComplete: false };
        }
      };`),
      environment: {
        IDE_HEALTHCHECK_ENDPOINT: healthCheckEndpoint,
        CUSTOM_SECURITY_HEADER: customSecurityHeader,
        CUSTOM_SECURITY_HEADER_VALUE: customSecurityHeaderValue,
      },
    });

    const checkIdAvailabilityProvider = new Provider(
      this,
      'check-id-availability-provider',
      {
        onEventHandler: new Function(this, 'no-op-handler', {
          runtime: Runtime.NODEJS_22_X,
          handler: 'index.handler',
          logRetention: RetentionDays.ONE_DAY,
          timeout: Duration.seconds(5),
          code: Code.fromInline('exports.handler = async () => true;'),
        }),
        isCompleteHandler: isAvailableHandler,
        totalTimeout: Duration.minutes(15),
        queryInterval: Duration.seconds(5),
        logRetention: RetentionDays.ONE_DAY,
      }
    );

    new CustomResource(this, 'Custom:IdeAvailability', {
      serviceToken: checkIdAvailabilityProvider.serviceToken,
    });

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
