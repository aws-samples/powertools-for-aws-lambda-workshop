// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { writeFile, readFile } from 'node:fs/promises';
import {
  CloudFormationClient,
  ListStacksCommand,
  DescribeStacksCommand,
} from '@aws-sdk/client-cloudformation';

const cfnClient = new CloudFormationClient({});

/**
 *
 * @param {string} name
 * @returns
 */
const getStackName = async (name) => {
  try {
    const res = await cfnClient.send(
      new ListStacksCommand({
        StackStatusFilter: [
          'CREATE_COMPLETE',
          'UPDATE_COMPLETE',
          'ROLLBACK_COMPLETE',
        ],
      })
    );
    const stack = res.StackSummaries.find(
      (stack) =>
        stack.StackName.toUpperCase().includes(name.toUpperCase()) &&
        stack.StackName.toUpperCase().includes('PROD')
    );
    if (!stack) {
      throw new Error('Unable to find stack among loaded ones');
    }

    return stack;
  } catch (err) {
    console.error(err);
    console.error('Unable to load CloudFormation stacks.');
    throw err;
  }
};

/**
 *
 * @param {string} stackName
 */
const getStackOutputs = async (stackName) => {
  try {
    const res = await cfnClient.send(
      new DescribeStacksCommand({
        StackName: stackName,
      })
    );
    if (res.Stacks.length === 0) {
      throw new Error('Stack not found');
    }
    const keys = [];
    const outputs = {};
    res.Stacks?.[0].Outputs.forEach(({ OutputKey, OutputValue }) => {
      outputs[OutputKey] = OutputValue;
      keys.push(OutputKey);
    });

    return {
      keys,
      vals: outputs,
    };
  } catch (err) {
    console.error(err);
    console.error('Unable to load CloudFormation Stack outputs.');
    throw err;
  }
};

/**
 *
 * @param {string} path
 */
const getParams = async (path) => {
  try {
    const fileContent = await readFile(path);
    const paramsObject = JSON.parse(fileContent);
    const paramsKeys = Object.keys(paramsObject.InfraStack);
    const paramsValues = paramsObject.InfraStack;

    return { keys: paramsKeys, vals: paramsValues };
  } catch (err) {
    throw err;
  }
};

const saveTemplate = async (template, path) => {
  try {
    await writeFile(
      path,
      `const awsmobile = ${JSON.stringify(template, null, 2)}
export default awsmobile;
  `
    );
  } catch (err) {
    console.error(err);
    console.error('Unable to write file');
    throw err;
  }
};

/**
 *
 * @param {string} namePart
 */
const getValueFromNamePart = (namePart, values) =>
  values.find((el) => el.includes(namePart));

const main = async () => {
  let keys;
  let vals;
  try {
    console.info('Trying to find output file locally.');
    const params = await getParams('../infra/cdk.out/params.json');
    keys = params.keys;
    vals = params.vals;
  } catch (err) {
    console.info('Unable to find output file locally, trying remotely.');
    try {
      const stackName = 'InfraStack';
      console.info(`Trying to find stack with ${stackName}`);
      const stack = await getStackName(stackName);
      const params = await getStackOutputs(stack.StackName);
      keys = params.keys;
      vals = params.vals;
      console.info(`Stack '${stack.StackName}' found remotely, using outputs from there.`);
    } catch (err) {
      console.error('Did you run `npm run infra:deploy` in the project root?');
      throw new Error('Unable to find parameters locally or remotely.');
    }
  }
  const template = {
    Auth: {},
  };

  const region = vals[getValueFromNamePart(`AWSRegion`, keys)];
  template.Auth.region = region;
  template.Auth.identityPoolId =
    vals[getValueFromNamePart(`IdentityPoolId`, keys)];
  template.Auth.userPoolId = vals[getValueFromNamePart(`UserPoolId`, keys)];
  template.Auth.userPoolWebClientId =
    vals[getValueFromNamePart(`UserPoolClientId`, keys)];
  const apiEndpointDomain = vals[getValueFromNamePart(`ApiEndpoint`, keys)];
  template.aws_appsync_authenticationType = 'AMAZON_COGNITO_USER_POOLS';
  template.aws_appsync_graphqlEndpoint = `https://${apiEndpointDomain}/graphql`;

  console.info('Creating config file at frontend/src/aws-exports.cjs');

  saveTemplate(template, '../frontend/src/aws-exports.cjs');
};

main();
