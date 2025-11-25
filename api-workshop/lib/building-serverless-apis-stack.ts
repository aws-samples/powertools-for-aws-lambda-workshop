import { CfnParameter, Stack, type StackProps } from 'aws-cdk-lib';
import { Asset } from 'aws-cdk-lib/aws-s3-assets';
import { NagSuppressions } from 'cdk-nag';
import type { Construct } from 'constructs';
import {
  CompletionConstruct,
  ComputeConstruct,
  DistributionConstruct,
  NetworkConstruct,
  RandomPasswordConstruct,
} from './attendant-ide/index.js';

export class BuildingServerlessAPIsStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // AssetBucket parameter (used only in Workshop Studio, not during development)
    const wsAssetBucket = new CfnParameter(this, 'AssetBucket', {
      type: 'String',
      description: 'S3 bucket for workshop assets',
      default: 'placeholder-value',
    });
    // AssetPrefix parameter (used only in Workshop Studio, not during development)
    const wsAssetPrefix = new CfnParameter(this, 'AssetPrefix', {
      type: 'String',
      description: 'Prefix for workshop assets (e.g., /prefix/)',
      default: '',
    });

    // Create a VPC with 1 public and 1 private subnet - the private subnet has a NAT gateway
    const network = new NetworkConstruct(this, 'network', {});
    const { vpc } = network;

    // Generated VSCode Password
    const randomPassword = new RandomPasswordConstruct(
      this,
      'random-password',
      {}
    );

    // Create asset with workshop files
    const workshopAssets = new Asset(this, 'WorkshopAssets', {
      path: './workshop-assets',
      exclude: [
        'cdk.out',
        'cdk.json',
        'node_modules',
        '.venv',
        '.aws-sam',
      ],
    });

    // Create a compute instance in the private subnet
    const compute = new ComputeConstruct(this, 'compute', {
      vpc,
      vscodePassword: randomPassword.randomPassword,
      workshopAssets,
      wsAssetPrefix: wsAssetPrefix.valueAsString,
      wsAssetBucket: wsAssetBucket.valueAsString,
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
    const { healthCheckEndpoint } = new DistributionConstruct(
      this,
      'distribution',
      {
        origin: network.loadBalancer.loadBalancerDnsName,
      }
    );

    new CompletionConstruct(this, 'completion', {
      healthCheckEndpoint,
    });

    NagSuppressions.addResourceSuppressionsByPath(
      this,
      '/BuildingServerlessAPIs/completion/check-id-availability-provider/waiter-state-machine/Resource',
      [
        {
          id: 'AwsSolutions-SF1',
          reason: 'Resource created and managed by CDK for custom resources.',
        },
        {
          id: 'AwsSolutions-SF2',
          reason: 'Resource created and managed by CDK for custom resources.',
        },
      ]
    );
  }
}
