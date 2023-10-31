import { Stack, type StackProps, CfnParameter, Fn } from 'aws-cdk-lib';
import * as cfn from 'aws-cdk-lib/aws-cloudformation';
import { Construct } from 'constructs';
import {
  NetworkConstruct,
  ComputeConstruct,
  DistributionConstruct,
  SecretConstruct,
  CompletionConstruct,
} from './attendant-ide';

export class IdeStack extends Stack {
  public constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // Create a VPC with 1 public and 1 private subnet - the private subnet has a NAT gateway
    const network = new NetworkConstruct(this, 'network', {});
    const { vpc } = network;

    // Import the WebsiteBucketName output from the source stack (SourceStack)
    const websiteBucketName = Fn.importValue('PowerToolsWorkshop-WebsiteBucketName');

    // Create a compute instance in the private subnet
    const compute = new ComputeConstruct(this, 'compute', {
      vpc,
      websiteBucketName: websiteBucketName,
    });
    const { instance, target } = compute;

    // Create a load balancer and add the instance as a target
    network.createLoadBalancerWithInstanceEc2Target(target);
    // Allow inbound HTTP from the load balancer
    compute.allowConnectionFromLoadBalancer(network.loadBalancer!);

    // Create a secret for the IDE password and grant read access to the instance
    const { secret } = new SecretConstruct(this, 'secret', {});
    secret.grantRead(instance);

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
  }
}
