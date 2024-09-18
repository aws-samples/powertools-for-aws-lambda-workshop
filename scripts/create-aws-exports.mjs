/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { readFile, writeFile } from 'node:fs/promises';
import {
  getStackName,
  getStackOutputs,
  getValueFromNamePart,
} from './shared.mjs';

/**
 *
 * @param {string} path
 * @param {string} stackName
 */
const getParamsLocally = async (path, stackName) => {
  try {
    const fileContent = await readFile(path);
    const paramsObject = JSON.parse(fileContent);
    const paramsKeys = Object.keys(paramsObject[stackName]);
    const paramsValues = paramsObject[stackName];

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

(async () => {
  const stackName = 'powertoolsworkshopinfra';
  let keys;
  let vals;
  try {
    console.info('Trying to find output file locally.');
    const params = await getParamsLocally(
      '../infra/cdk.out/params.json',
      stackName
    );
    keys = params.keys;
    vals = params.vals;
  } catch (err) {
    console.info('Unable to find output file locally, trying remotely.');
    try {
      console.info(`Trying to find stack with ${stackName}`);
      const stack = await getStackName(stackName);
      const params = await getStackOutputs(stack.StackName);
      keys = params.keys;
      vals = params.vals;
      console.info(
        `Stack '${stack.StackName}' found remotely, using outputs from there.`
      );
    } catch (err) {
      console.error('Did you run `npm run infra:deploy` in the project root?');
      throw new Error('Unable to find parameters locally or remotely.');
    }
  }
  const template = {};

  const region = vals[getValueFromNamePart('AWSRegion', keys)];
  template.aws_project_region = region;
  template.aws_cognito_region = region;
  template.aws_cognito_identity_pool_id =
    vals[getValueFromNamePart('IdentityPoolId', keys)];
  template.aws_user_pools_id = vals[getValueFromNamePart('UserPoolId', keys)];
  template.aws_user_pools_web_client_id =
    vals[getValueFromNamePart('UserPoolClientId', keys)];
  const apiEndpointDomain = vals[getValueFromNamePart('ApiEndpoint', keys)];
  template.aws_appsync_authenticationType = 'AMAZON_COGNITO_USER_POOLS';
  template.aws_appsync_graphqlEndpoint = `https://${apiEndpointDomain}/graphql`;

  console.info('Creating config file at frontend/src/aws-exports.cjs');

  saveTemplate(template, '../frontend/src/aws-exports.cjs');
})();
