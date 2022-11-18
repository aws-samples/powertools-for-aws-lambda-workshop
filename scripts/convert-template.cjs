// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

const { writeFile, readFile, mkdir } = require("node:fs/promises");
const { existsSync } = require("node:fs");
const { join } = require("path");
const shell = require("shelljs");

const getJSONFile = async (path) => {
  try {
    const templateContent = await readFile(path, {
      encoding: "utf-8",
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

const main = async () => {
  const currentDir = process.cwd();
  const basePath = "../infra/cdk.out";
  const stackName = "InfraStack-prod";
  const cfnTemplateFileName = `${stackName}.template.json`;
  const assetsFileName = `${stackName}.assets.json`;
  // Get original Cfn template
  const template = await getJSONFile(join(basePath, cfnTemplateFileName));
  // Remove Rules section
  delete template.Rules;
  // Empty Parameters section
  delete template.Parameters.BootstrapVersion;
  // Put a new Parameter for the S3 bucket where assets will be placed
  template.Parameters.AssetBucket = {
    Type: "String",
    Description:
      "Name of the Amazon S3 Bucket where the assets related to this stack will be found. The stack references this bucket.",
  };
  // Put a new Parameter for the S3 bucket prefix where assets are
  template.Parameters.AssetPrefix = {
    Type: "String",
    Description:
      "Prefix of the Amazon S3 Bucket where the assets related to this stack are. This prefix is prepended to asset keys.",
  };
  // Remove metadata from all resources
  Object.keys(template.Resources).forEach((resourceKey) => {
    if (!template.Resources[resourceKey].hasOwnProperty("Metadata")) return;
    delete template.Resources[resourceKey].Metadata;
  });
  if (template.Resources.hasOwnProperty("Metadata"))
    delete template.Resources.Metadata;
  if (template.Resources.hasOwnProperty("CDKMetadata"))
    delete template.Resources.CDKMetadata;
  // Remove CDKMetadataAvailable from Conditions
  if (
    template.hasOwnProperty("Conditions") &&
    template.Conditions.hasOwnProperty("CDKMetadataAvailable")
  )
    delete template.Conditions.CDKMetadataAvailable;
  // Remove main
  // Replace S3Bucket key in resources with Type===AWS::Lambda::Function && Code.S3Bucket
  Object.keys(template.Resources).forEach((resourceKey) => {
    if (template.Resources[resourceKey].Type !== "AWS::Lambda::Function")
      return;
    if (template.Resources[resourceKey].Properties.Code.ZipFile) return;
    template.Resources[resourceKey].Properties.Code.S3Bucket = {
      Ref: "AssetBucket",
    };
    template.Resources[resourceKey].Properties.Code.S3Key = {
      "Fn::Sub": [
        "${Prefix}" + template.Resources[resourceKey].Properties.Code.S3Key,
        {
          Prefix: {
            Ref: "AssetPrefix",
          },
        },
      ],
    };
  });

  // Empty or create the custom out directory
  const outDir = join(basePath, "deploy");
  if (existsSync(outDir)) {
    shell.cd(outDir);
    shell.rm("-rf", "*");
    shell.cd(currentDir);
  } else {
    await mkdir(outDir);
  }

  // Get assets list
  const assets = await getJSONFile(join(basePath, assetsFileName));
  // Create a zip archive for each asset and place it in the out dir
  Object.values(assets.files).forEach((file) => {
    if (file.source.packaging !== "zip") return;
    shell.cd(join(basePath, file.source.path));
    console.log(
      `Running: zip -r ${file.destinations["current_account-current_region"].objectKey} ./`
    );
    shell.exec(
      `zip -r ${file.destinations["current_account-current_region"].objectKey} ./`
    );
    shell.exec(
      `mv ${file.destinations["current_account-current_region"].objectKey} ../deploy`
    );
    shell.cd(currentDir);
  });

  // Save modified Cfn template in the out dir
  await writeJSONFile(template, join(outDir, `${cfnTemplateFileName}`));
};

main();
