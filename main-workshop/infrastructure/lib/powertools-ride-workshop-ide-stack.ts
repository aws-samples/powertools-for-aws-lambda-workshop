import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { CfnParameter } from 'aws-cdk-lib';
import { NetworkConstruct } from './attendant-ide/network-construct';
import { RandomPasswordConstruct } from './attendant-ide/random-password-construct';
import { ComputeConstruct } from './attendant-ide/compute-construct';
import { DistributionConstruct } from './attendant-ide/distribution-construct';
import { CompletionConstruct } from './attendant-ide/completion-construct';

export interface RiderWorkshopIdeStackProps extends cdk.StackProps {
  gitRepoUrl?: string;
}

/**
 * IDE stack for the PowertoolsRide workshop
 * Contains VSCode on Browser infrastructure
 */
export class RiderWorkshopIdeStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: RiderWorkshopIdeStackProps = {}) {
    super(scope, id, props);

    // Git repository URL parameter
    const gitRepoUrl = new CfnParameter(this, 'GitRepoUrl', {
      type: 'String',
      description: 'Git repository URL for workshop content',
      default: props.gitRepoUrl || 'https://github.com/aws-samples/powertools-for-aws-lambda-workshop',
    });

    // Create a VPC with 1 public and 1 private subnet - the private subnet has a NAT gateway
    const network = new NetworkConstruct(this, 'network', {});
    const { vpc } = network;

    // Generated VSCode Password
    const randomPassword = new RandomPasswordConstruct(this, 'random-password', {});

    // Create a compute instance in the private subnet
    const compute = new ComputeConstruct(this, 'compute', {
      vpc,
      vscodePassword: randomPassword.randomPassword,
      gitRepoUrl: gitRepoUrl.valueAsString,
    });
    const { target } = compute;

    // Create a load balancer and add the instance as a target
    network.createLoadBalancerWithInstanceEc2Target(target);
    if (network.loadBalancer === undefined) {
      throw new Error('Load balancer not created');
    }

    // Allow inbound HTTP from the load balancer
    compute.allowConnectionFromLoadBalancer(network.loadBalancer);

    // Create a CloudFront distribution in front of the load balancer
    const distribution = new DistributionConstruct(this, 'distribution', {
      origin: network.loadBalancer.loadBalancerDnsName,
    });

    new CompletionConstruct(this, 'completion', {
      healthCheckEndpoint: distribution.healthCheckEndpoint,
    });

    // Output clean names at stack level
    new cdk.CfnOutput(this, 'WebIDE', {
      value: distribution.ideUrl,
      description: 'Web IDE URL',
    });

    new cdk.CfnOutput(this, 'IDEPassword', {
      value: randomPassword.randomPassword,
      description: 'Password for VSCode Web IDE',
    });
  }
}
