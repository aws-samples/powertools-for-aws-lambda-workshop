import {
  CustomResource,
  Duration,
  RemovalPolicy,
  type StackProps,
} from 'aws-cdk-lib';
import {
  Code,
  Function as LambdaFunction,
  Runtime,
} from 'aws-cdk-lib/aws-lambda';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Provider } from 'aws-cdk-lib/custom-resources';
import { NagSuppressions } from 'cdk-nag';
import { Construct } from 'constructs';
import {
  customSecurityHeader,
  customSecurityHeaderValue,
} from './constants.js';

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

    const isAvailableHandler = new LambdaFunction(this, 'is-available', {
      runtime: Runtime.NODEJS_22_X,
      handler: 'index.handler',
      logGroup: new LogGroup(this, 'is-available-fn-log', {
        removalPolicy: RemovalPolicy.DESTROY,
        retention: RetentionDays.ONE_DAY,
      }),
      timeout: Duration.seconds(30),
      code: Code.fromInline(`
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
        onEventHandler: new LambdaFunction(this, 'no-op-handler', {
          runtime: Runtime.NODEJS_22_X,
          handler: 'index.handler',
          logGroup: new LogGroup(this, 'no-op-handler-fn-log', {
            removalPolicy: RemovalPolicy.DESTROY,
            retention: RetentionDays.ONE_DAY,
          }),
          timeout: Duration.seconds(5),
          code: Code.fromInline('exports.handler = async () => true;'),
        }),
        isCompleteHandler: isAvailableHandler,
        totalTimeout: Duration.minutes(15),
        queryInterval: Duration.seconds(5),
        logGroup: new LogGroup(this, 'check-id-availability-log', {
          removalPolicy: RemovalPolicy.DESTROY,
          retention: RetentionDays.ONE_DAY,
        }),
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
