import { Stack, type StackProps, Fn, CfnParameter } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {
  NetworkConstruct,
  ComputeConstruct,
  DistributionConstruct,
  CompletionConstruct,
  RandomPasswordConstruct,
} from './attendant-ide/index.js';
import { environment } from './constants.js';
import { NagSuppressions } from 'cdk-nag';

export class IdeStack extends Stack {
  public constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // Create a VPC with 1 public and 1 private subnet - the private subnet has a NAT gateway
    const network = new NetworkConstruct(this, 'network', {});
    const { vpc } = network;

    // Import the WebsiteBucketName output from the source stack (SourceStack)
    const websiteBucketName = Fn.importValue(
      `powertoolsworkshopinfra-WebsiteBucketName${
        environment === 'prod' ? `-prod` : ''
      }`
    );

    // Generated VSCode Password
    const randomPassword = new RandomPasswordConstruct(this, 'random-password', {});

    // Create a compute instance in the private subnet
    const compute = new ComputeConstruct(this, 'compute', {
      vpc,
      websiteBucketName: websiteBucketName,
      vscodePassword: randomPassword.randomPassword,
    });
    const { instance, target } = compute;

    // Create a load balancer and add the instance as a target
    network.createLoadBalancerWithInstanceEc2Target(target);
    // Allow inbound HTTP from the load balancer
    compute.allowConnectionFromLoadBalancer(network.loadBalancer!);

    // Create a CloudFront distribution in front of the load balancer
    const { healthCheckEndpoint } = new DistributionConstruct(
      this,
      'distribution',
      {
        origin: network.loadBalancer!.loadBalancerDnsName,
      }
    );

    new CompletionConstruct(this, 'completion', {
      healthCheckEndpoint,
    });

    [
      'powertoolsworkshopide/LogRetentionaae0aa3c5b4d4f87b02d85b201efdd8a/ServiceRole/Resource',
      'powertoolsworkshopide/LogRetentionaae0aa3c5b4d4f87b02d85b201efdd8a/ServiceRole/DefaultPolicy/Resource',
    ].forEach((resourcePath: string) => {
      let id = 'AwsSolutions-L1';
      let reason = 'Resource created and managed by CDK.';
      if (resourcePath.endsWith('ServiceRole/Resource')) {
        id = 'AwsSolutions-IAM4';
      } else if (resourcePath.endsWith('DefaultPolicy/Resource')) {
        id = 'AwsSolutions-IAM5';
        reason +=
          ' This type of resource is a singleton fn that interacts with many resources so IAM policies are lax by design to allow this use case.';
      }
      NagSuppressions.addResourceSuppressionsByPath(this, resourcePath, [
        {
          id,
          reason,
        },
      ]);
    });

    NagSuppressions.addResourceSuppressionsByPath(this, '/powertoolsworkshopide/completion/check-id-availability-provider/waiter-state-machine/Resource', [
      {
        id: 'AwsSolutions-SF1',
        reason: 'Resource created and managed by CDK for custom resources.',
      },
      {
        id: 'AwsSolutions-SF2',
        reason: 'Resource created and managed by CDK for custom resources.',
      },
    ]);
  }
}
