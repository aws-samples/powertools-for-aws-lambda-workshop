#!/usr/bin/env node
import 'source-map-support/register';
import {
  App,
  Aspects,
  type CfnResource,
  RemovalPolicy,
  type IAspect,
} from 'aws-cdk-lib';
import { AwsSolutionsChecks } from 'cdk-nag';
import { environment, powertoolsServiceName } from './lib/constants.js';
import { IdeStack } from './lib/ide-stack.js';
import { InfraStack } from './lib/infra-stack.js';
import type { IConstruct } from 'constructs';

const app = new App();
const isCI = app.node.tryGetContext('CI') === 'true';
if (isCI) {
  console.log('Running in CI/CD mode');
  Aspects.of(app).add(new AwsSolutionsChecks());
}

class RetentionPolicyDestroySetter implements IAspect {
  public visit(node: IConstruct) {
    try {
      (node.node.defaultChild as CfnResource).applyRemovalPolicy(
        RemovalPolicy.DESTROY
      );
    } catch {}
  }
}
Aspects.of(app).add(new RetentionPolicyDestroySetter());
new InfraStack(app, 'powertoolsworkshopinfra', {
  description: '(uksb-yso2t7jeel) (tag:powertoolsworkshopinfra)',
  tags: {
    Service: powertoolsServiceName,
    Environment: environment,
    ManagedBy: 'CDK',
    GithubRepo: 'aws-samples/powertools-for-aws-lambda-workshop',
    Owner: 'AWS',
    AwsRegion: process.env.CDK_DEFAULT_REGION || 'N/A',
    AwsAccountId: process.env.CDK_DEFAULT_ACCOUNT || 'N/A',
  },
});
new IdeStack(app, 'powertoolsworkshopide', {
  description: '(uksb-yso2t7jeel) (tag:powertoolsworkshopide)',
  tags: {
    Service: powertoolsServiceName,
    Environment: environment,
    ManagedBy: 'CDK',
    GithubRepo: 'aws-samples/powertools-for-aws-lambda-workshop',
    Owner: 'AWS',
    AwsRegion: process.env.CDK_DEFAULT_REGION || 'N/A',
    AwsAccountId: process.env.CDK_DEFAULT_ACCOUNT || 'N/A',
  },
});
