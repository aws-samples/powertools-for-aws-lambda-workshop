import { existsSync } from 'node:fs';
/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { join } from 'path';
import shelljs from 'shelljs';

const getJSONFile = async (path) => {
  try {
    const templateContent = await readFile(path, {
      encoding: 'utf-8',
    });

    return JSON.parse(templateContent);
  } catch (err) {
    console.error(err);
    console.error(`Unable to read JSON file ${path}`);
  }
};

const writeJSONFile = async (content, path) => {
  try {
    await writeFile(path, JSON.stringify(content, null, 2));
  } catch (err) {
    console.error(err);
    console.error(`Unable to write JSON file ${path}`);
  }
};

(async () => {
  // Get argument passed to the script
  const args = process.argv.slice(2);
  const [stackName] = args;
  if (!stackName) {
    console.error(
      'Please provide a stack name as an argument to the script\n e.g. node scripts/convert-template.cjs powertoolsworkshopinfra'
    );
    throw new Error('No stack name provided');
  }
  console.log(`Converting template for stack ${stackName}`);
  const currentDir = process.cwd();
  const basePath = '../infra/cdk.out';
  const cfnTemplateFileName = `${stackName}.template.json`;
  const cfnTemplateFileNameOut = `${stackName}.json`;
  const assetsFileName = `${stackName}.assets.json`;
  // Get original Cfn template
  const template = await getJSONFile(join(basePath, cfnTemplateFileName));
  // Remove Rules section
  delete template.Rules;
  // Empty Parameters section
  delete template.Parameters.BootstrapVersion;
  // Put a new Parameter for the S3 bucket where assets will be placed
  template.Parameters.AssetBucket = {
    Type: 'String',
    Description:
      'Name of the Amazon S3 Bucket where the assets related to this stack will be found. The stack references this bucket.',
  };
  // Put a new Parameter for the S3 bucket prefix where assets are
  template.Parameters.AssetPrefix = {
    Type: 'String',
    Description:
      'Prefix of the Amazon S3 Bucket where the assets related to this stack are. This prefix is prepended to asset keys.',
  };
  // Remove metadata from all resources
  Object.keys(template.Resources).forEach((resourceKey) => {
    if (!template.Resources[resourceKey].hasOwnProperty('Metadata')) return;
    delete template.Resources[resourceKey].Metadata;
  });
  if (template.Resources.hasOwnProperty('Metadata'))
    delete template.Resources.Metadata;
  if (template.Resources.hasOwnProperty('CDKMetadata'))
    delete template.Resources.CDKMetadata;
  // Remove CDKMetadataAvailable from Conditions
  if (
    template.hasOwnProperty('Conditions') &&
    template.Conditions.hasOwnProperty('CDKMetadataAvailable')
  )
    delete template.Conditions.CDKMetadataAvailable;

  // Replace S3Bucket key in resources with (Type===AWS::Lambda::Function || AWS::Lambda::LayerVersion) && Code.S3Bucket
  Object.keys(template.Resources).forEach((resourceKey) => {
    if (
      !['AWS::Lambda::Function', 'AWS::Lambda::LayerVersion'].includes(
        template.Resources[resourceKey].Type
      )
    )
      return;
    if (template.Resources[resourceKey].Type === 'AWS::Lambda::LayerVersion') {
      template.Resources[resourceKey].Properties.Content.S3Bucket = {
        Ref: 'AssetBucket',
      };
      template.Resources[resourceKey].Properties.Content.S3Key = {
        'Fn::Sub': [
          '${Prefix}' +
            template.Resources[resourceKey].Properties.Content.S3Key,
          {
            Prefix: {
              Ref: 'AssetPrefix',
            },
          },
        ],
      };
    } else {
      if (template.Resources[resourceKey].Properties.Code.ZipFile) return;
      template.Resources[resourceKey].Properties.Code.S3Bucket = {
        Ref: 'AssetBucket',
      };
      template.Resources[resourceKey].Properties.Code.S3Key = {
        'Fn::Sub': [
          '${Prefix}' + template.Resources[resourceKey].Properties.Code.S3Key,
          {
            Prefix: {
              Ref: 'AssetPrefix',
            },
          },
        ],
      };
    }
  });

  // Empty or create the custom out directory
  const outDir = join('..', 'ws-studio-build', stackName);
  if (existsSync(outDir)) {
    shelljs.cd(outDir);
    shelljs.rm('-rf', '*');
    shelljs.cd(currentDir);
  } else {
    await mkdir(outDir, { recursive: true });
  }

  // Get assets list
  const assets = await getJSONFile(join(basePath, assetsFileName));
  // Create a zip archive for each asset and place it in the out dir
  Object.values(assets.files).forEach((file) => {
    if (file.source.packaging !== 'zip') return;
    shelljs.cd(join(basePath, file.source.path));
    console.log(
      `Running: zip -r ${file.destinations['current_account-current_region'].objectKey} ./`
    );
    shelljs.exec(
      `zip -r ${file.destinations['current_account-current_region'].objectKey} ./`
    );
    shelljs.exec(
      `mv ${file.destinations['current_account-current_region'].objectKey} ${resolve(currentDir, outDir)}/`
    );
    shelljs.cd(currentDir);
  });

  // Save modified Cfn template in the out dir
  await writeJSONFile(template, join(outDir, `${cfnTemplateFileNameOut}`));

  console.log(
    `Template for stack ${stackName} converted successfully, you can find it in ${outDir}`
  );
})();
