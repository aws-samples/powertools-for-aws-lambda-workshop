import { writeFile, readFile } from "node:fs/promises";

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
    console.error(err);
    console.error("Did you run `npm run infra:deploy` in the project root?");
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
    console.error("Unable to write file");
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
  const { keys, vals } = await getParams("../infra/cdk.out/params.json");
  const template = {
    Auth: {},
    API: {
      endpoints: [{ name: "main" }],
    },
  };

  const region = vals[getValueFromNamePart(`AWSRegion`, keys)];
  template.Auth.region = region;
  template.Auth.identityPoolId =
    vals[getValueFromNamePart(`IdentityPoolId`, keys)];
  template.Auth.userPoolId = vals[getValueFromNamePart(`UserPoolId`, keys)];
  template.Auth.userPoolWebClientId =
    vals[getValueFromNamePart(`UserPoolClientId`, keys)];
  template.API.endpoints[0].region = region;
  const cloudfrontDistribution =
    vals[getValueFromNamePart(`DistributionDomainName`, keys)];
  template.API.endpoints[0].endpoint = `https://${cloudfrontDistribution}/api`;

  saveTemplate(template, "../frontend/src/aws-exports.cjs");
};

main();
