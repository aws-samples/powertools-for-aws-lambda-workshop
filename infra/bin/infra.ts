#!/usr/bin/env node
import 'source-map-support/register';
import { App, Aspects } from 'aws-cdk-lib';
import { InfraStack } from '../lib/infra-stack';
import { IdeStack } from '../lib/ide-stack';
import { powertoolsServiceName, environment } from '../lib/constants';
import { AwsSolutionsChecks } from 'cdk-nag';

const app = new App();
const isCI = app.node.tryGetContext('CI') === 'true' ? true : false;
if (isCI) {
  console.log('Running in CI/CD mode');
  Aspects.of(app).add(new AwsSolutionsChecks());
}
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
