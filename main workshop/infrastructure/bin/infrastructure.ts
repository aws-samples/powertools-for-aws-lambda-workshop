#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import * as fs from 'fs';
import * as path from 'path';
import { RiderWorkshopInfrastructureStack } from '../lib/powertools-ride-workshop-infrastructure-stack';
import { RiderWorkshopServicesStack } from '../lib/powertools-ride-workshop-services-stack';
import { RiderWorkshopIdeStack } from '../lib/powertools-ride-workshop-ide-stack';
import { RiderWorkshopLoadGeneratorStack } from '../lib/powertools-ride-workshop-load-generator-stack';

const app = new cdk.App();

// Deployment configuration
const deploymentType = app.node.tryGetContext('deploymentType') || process.env.DEPLOYMENT_TYPE || 'infrastructure';
const language = app.node.tryGetContext('language') || process.env.WORKSHOP_LANGUAGE;
const cleanDeploy = app.node.tryGetContext('cleanDeploy') !== 'false';

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT || process.env.AWS_ACCOUNT_ID,
  region: process.env.CDK_DEFAULT_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1'
};

console.log(`🎯 Deployment: ${deploymentType} | Clean: ${cleanDeploy ? 'YES' : 'NO'}`);

function checkLanguageServicesExist(lang: string): boolean {
  const servicesDir = path.join(__dirname, '../../services', lang);
  return fs.existsSync(servicesDir);
}

// Deploy based on type
switch (deploymentType) {
  case 'infrastructure':
    new RiderWorkshopInfrastructureStack(app, 'RiderWorkshopInfrastructureStack', {
      env,
      cleanDeploy,
    });
    break;

  case 'ide': {
    const gitRepoUrl = app.node.tryGetContext('gitRepoUrl') || process.env.GIT_REPO_URL;
    new RiderWorkshopIdeStack(app, 'RiderWorkshopIdeStack', {
      env,
      gitRepoUrl,
    });
    break;
  }

  case 'services':
    if (!language) {
      throw new Error('❌ Language required. Use: --context language=typescript');
    }
    if (!checkLanguageServicesExist(language)) {
      throw new Error(`❌ No services found for: ${language}`);
    }
    new RiderWorkshopServicesStack(app, 'RiderWorkshopServicesStack', {
      env,
      language,
    });
    break;

  case 'load-generator': {
    const module = app.node.tryGetContext('module') || 'all-modules';
    const ridesPerMinute = parseInt(app.node.tryGetContext('ridesPerMinute') || '120');
    const restartIntervalHours = parseInt(app.node.tryGetContext('restartIntervalHours') || '3');
    new RiderWorkshopLoadGeneratorStack(app, 'RiderWorkshopLoadGeneratorStack', {
      env,
      module,
      ridesPerMinute,
      restartInterval: cdk.Duration.hours(restartIntervalHours),
    });
    break;
  }

  default:
    throw new Error(`❌ Unknown deployment type: ${deploymentType}`);
}
