#!/usr/bin/env node
import 'source-map-support/register';
import { App, Aspects } from 'aws-cdk-lib';
import { AwsSolutionsChecks } from 'cdk-nag';
import { BuildingServerlessAPIsStack } from './building-serverless-apis-stack.js';

const app = new App();
const isCI = app.node.tryGetContext('CI') === 'true';
if (isCI) {
  console.log('Running in CI/CD mode');
  Aspects.of(app).add(new AwsSolutionsChecks());
}
new BuildingServerlessAPIsStack(app, 'BuildingServerlessAPIs', {
  // description: '', // TODO: add tracking ID
  tags: {
    Service: 'BuildingServerlessAPIsWorkshop',
    ManagedBy: 'CDK',
    Owner: 'AWS',
    AwsRegion: process.env.CDK_DEFAULT_REGION || 'N/A',
    AwsAccountId: process.env.CDK_DEFAULT_ACCOUNT || 'N/A',
  },
});
