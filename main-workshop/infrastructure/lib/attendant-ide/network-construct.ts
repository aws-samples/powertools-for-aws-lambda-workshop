import { RemovalPolicy, type StackProps } from 'aws-cdk-lib';
import {
  FlowLogDestination,
  FlowLogTrafficType,
  SubnetType,
  Vpc,
} from 'aws-cdk-lib/aws-ec2';
import {
  ApplicationLoadBalancer,
  ApplicationProtocol,
  ListenerAction,
  ListenerCondition,
  Protocol,
} from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import type { InstanceIdTarget } from 'aws-cdk-lib/aws-elasticloadbalancingv2-targets';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { NagSuppressions } from 'cdk-nag';
import { Construct } from 'constructs';
import {
  customSecurityHeader,
  customSecurityHeaderValue,
  idePort,
} from './constants';

interface NetworkConstructProps extends StackProps {}

export class NetworkConstruct extends Construct {
  public readonly vpc: Vpc;
  public loadBalancer?: ApplicationLoadBalancer;

  public constructor(
    scope: Construct,
    id: string,
    _props: NetworkConstructProps
  ) {
    super(scope, id);

    // Create log group for VPC Flow Logs with proper cleanup
    const vpcFlowLogGroup = new LogGroup(this, 'VPCFlowLogGroup', {
      retention: RetentionDays.ONE_DAY,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    this.vpc = new Vpc(this, 'VPC', {
      maxAzs: 2,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'Public',
          subnetType: SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: 'Private',
          subnetType: SubnetType.PRIVATE_WITH_EGRESS,
        },
      ],
      flowLogs: {
        VPCFlowLogs: {
          destination: FlowLogDestination.toCloudWatchLogs(vpcFlowLogGroup),
          trafficType: FlowLogTrafficType.REJECT,
        },
      },
    });

    // Ensure VPC and all its resources are destroyed when stack is deleted
    this.vpc.applyRemovalPolicy(RemovalPolicy.DESTROY);
  }

  public createLoadBalancerWithInstanceEc2Target(
    target: InstanceIdTarget
  ): ApplicationLoadBalancer {
    this.loadBalancer = new ApplicationLoadBalancer(this, 'vscode-lb', {
      vpc: this.vpc,
      internetFacing: true,
    });

    // Ensure load balancer is destroyed when stack is deleted
    this.loadBalancer.applyRemovalPolicy(RemovalPolicy.DESTROY);

    const listener = this.loadBalancer.addListener('vscode-listener', {
      port: 80,
      protocol: ApplicationProtocol.HTTP,
    });

    listener.addTargets('vscode-target', {
      port: 80,
      targets: [target],
      healthCheck: {
        path: '/healthz',
        port: idePort,
        protocol: Protocol.HTTP,
      },
      priority: 10,
      conditions: [
        ListenerCondition.httpHeader(customSecurityHeader, [
          customSecurityHeaderValue,
        ]),
      ],
    });
    listener.addAction('vscode-redirect', {
      action: ListenerAction.fixedResponse(403, {
        messageBody: 'Forbidden',
      }),
    });

    NagSuppressions.addResourceSuppressions(
      this.loadBalancer,
      [
        {
          id: 'AwsSolutions-ELB2',
          reason:
            'This load balancer is used to provide access to the IDE for the duration of the workshop. For production usages, consider enabling access logs.',
        },
        {
          id: 'AwsSolutions-EC23',
          reason:
            'This load balancer is used to provide access to the IDE for the duration of the workshop and the source IP address of the attendant is not known beforehand. For production usages, narrowing down the CIDR for inboud.',
        },
      ],
      true
    );

    return this.loadBalancer;
  }
}
