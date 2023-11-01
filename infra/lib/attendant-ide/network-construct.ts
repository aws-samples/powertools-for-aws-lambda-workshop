import { type StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {
  Vpc,
  SubnetType,
  FlowLogDestination,
  FlowLogTrafficType,
} from 'aws-cdk-lib/aws-ec2';
import {
  ApplicationLoadBalancer,
  ApplicationProtocol,
  ListenerAction,
  ListenerCondition,
  Protocol,
} from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { type InstanceIdTarget } from 'aws-cdk-lib/aws-elasticloadbalancingv2-targets';
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
          destination: FlowLogDestination.toCloudWatchLogs(),
          trafficType: FlowLogTrafficType.REJECT,
        },
      },
    });
  }

  public createLoadBalancerWithInstanceEc2Target(
    target: InstanceIdTarget
  ): ApplicationLoadBalancer {
    this.loadBalancer = new ApplicationLoadBalancer(this, 'vscode-lb', {
      vpc: this.vpc,
      internetFacing: true,
    });

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

    return this.loadBalancer;
  }
}
