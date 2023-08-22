#!/usr/bin/env node
import 'source-map-support/register';
import { App, Aspects } from 'aws-cdk-lib';
import { InfraStack } from '../lib/infra-stack';
import { powertoolsServiceName, environment } from '../lib/constants';
import { AwsSolutionsChecks } from 'cdk-nag';

const app = new App();
// Aspects.of(app).add(new AwsSolutionsChecks({ verbose: true }));
new InfraStack(app, 'InfraStack', {
  tags: {
    Service: powertoolsServiceName,
    Environment: environment,
    ManagedBy: 'CDK',
    GithubRepo: 'aws-samples/aws-lambda-powertools-workshop',
    Owner: 'AWS',
    AwsRegion: process.env.CDK_DEFAULT_REGION || 'N/A',
    AwsAccountId: process.env.CDK_DEFAULT_ACCOUNT || 'N/A',
  },
});
