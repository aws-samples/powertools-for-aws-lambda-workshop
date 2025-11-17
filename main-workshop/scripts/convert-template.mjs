import { existsSync } from 'node:fs';
/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { mkdir, readFile, writeFile, rm, rename } from 'node:fs/promises';
import { resolve } from 'node:path';
import { join } from 'path';
import { execSync } from 'node:child_process';
import { readdirSync } from 'node:fs';

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
  // Resolve CDK output directory relative to the repository root (cwd)
  const basePath = resolve(currentDir, 'infrastructure', 'cdk.out');
  const cfnTemplateFileName = `${stackName}.template.json`;
  const cfnTemplateFileNameOut = `${stackName}.json`;
  const assetsFileName = `${stackName}.assets.json`;
  // Get original Cfn template
  const template = await getJSONFile(join(basePath, cfnTemplateFileName));
  if (!template) {
    console.error(`Failed to load template ${join(basePath, cfnTemplateFileName)}; aborting`);
    process.exit(1);
  }
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
  // Add Language parameter for services stack
  if (stackName === 'powertoolsworkshopservices') {
    template.Parameters.Language = {
      Type: 'String',
      Description: 'Programming language for the services (typescript, python, java, dotnet)',
      Default: 'typescript',
      AllowedValues: ['typescript', 'python', 'java', 'dotnet'],
    };
  }
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

  // Define output directories: templates go to Workshop/static/cfn, assets to Workshop/assets/<stackName>
  const templatesOutDir = resolve(currentDir, 'Workshop', 'static', 'cfn');
  // Determine canonical asset folder name to match template filenames
  let assetsFolderName = stackName;
  if (stackName === 'powertoolsworkshopide') assetsFolderName = 'powertoolsworkshopide';
  if (stackName === 'powertoolsworkshopinfra') assetsFolderName = 'powertoolsworkshopinfra';
  if (stackName === 'powertoolsworkshopservices') assetsFolderName = 'powertoolsworkshopservices';
  if (stackName === 'powertoolsworkshopload') assetsFolderName = 'powertoolsworkshopload';
  const assetsOutDir = resolve(currentDir, 'Workshop', 'assets', assetsFolderName);

  // If there is an existing assets folder named after the stackName, rename it to the canonical name
  const legacyAssetsDir = resolve(currentDir, 'Workshop', 'assets', stackName);
  if (existsSync(legacyAssetsDir) && !existsSync(assetsOutDir)) {
    try {
      await rename(legacyAssetsDir, assetsOutDir);
      console.log(`Renamed legacy assets folder ${legacyAssetsDir} -> ${assetsOutDir}`);
    } catch (err) {
      console.error(`Failed to rename legacy assets folder: ${err}`);
    }
  }

  // Ensure templates out dir exists
  if (!existsSync(templatesOutDir)) {
    await mkdir(templatesOutDir, { recursive: true });
  }

  // Ensure a clean assets out dir for this stack
  if (existsSync(assetsOutDir)) {
    const entries = readdirSync(assetsOutDir);
    for (const entry of entries) {
      await rm(join(assetsOutDir, entry), { recursive: true, force: true });
    }
  } else {
    await mkdir(assetsOutDir, { recursive: true });
  }

  // Get assets list
  const assets = await getJSONFile(join(basePath, assetsFileName));
  if (!assets) {
    console.error(`Failed to load assets ${join(basePath, assetsFileName)}; aborting`);
    process.exit(1);
  }
  // Create a zip archive for each asset and place it in the out dir
  for (const file of Object.values(assets.files)) {
    if (file.source.packaging !== 'zip') continue;
    const assetPath = join(basePath, file.source.path);
    // find any destination key (they're in format: accountId-region-hash or current_account-region-hash)
    const destKeys = Object.keys(file.destinations || {});
    const accountKey = destKeys.find((k) => k.startsWith('current_account-')) || destKeys[0];
    if (!accountKey) {
      console.error(`No destination key found for asset: ${JSON.stringify(file)}`);
      continue;
    }
    const zipName = file.destinations[accountKey].objectKey;
    console.log(`Running: zip -r ${zipName} ./ (in ${assetPath})`);
    try {
      // run zip in the assetPath and then move the resulting file to assetsOutDir
      execSync(`zip -r ${zipName} ./`, { cwd: assetPath, stdio: 'inherit' });
      const srcZip = resolve(assetPath, zipName);
      const destZip = resolve(assetsOutDir, zipName);
      // ensure assetsOutDir exists (should already)
      await mkdir(assetsOutDir, { recursive: true });
      // move the zip
      await rename(srcZip, destZip);
    } catch (err) {
      console.error(err);
      console.error(`Failed to create/move zip ${zipName} from ${assetPath}`);
    }
  }

  // Replace hardcoded regions and account IDs with pseudo-parameters
  const replaceHardcodedValues = (obj, region, accountId, parentKey = '', isInFnJoin = false) => {
    if (typeof obj === 'string') {
      // Special handling for AvailabilityZone - use Fn::GetAZs
      if (parentKey === 'AvailabilityZone' && obj.match(new RegExp(`${region}[a-z]`))) {
        // Extract the AZ suffix (a, b, c, etc.)
        const azSuffix = obj.replace(region, '');
        const azIndex = azSuffix.charCodeAt(0) - 'a'.charCodeAt(0);
        return {
          'Fn::Select': [azIndex, { 'Fn::GetAZs': { Ref: 'AWS::Region' } }]
        };
      }

      // Don't replace account IDs or regions inside asset hashes
      // Asset hashes are 64 character hex strings that might contain sequences that look like account IDs
      // Check if this string is an asset hash or contains an asset hash
      const hasAssetHash = /[a-f0-9]{64}\.zip/.test(obj);
      if (hasAssetHash) {
        return obj;
      }

      // If we're inside Fn::Join, we need to split the string and use Ref objects
      if (isInFnJoin && (obj.includes(accountId) || obj.includes(region))) {
        const parts = [];
        let remaining = obj;

        // Replace account IDs
        while (remaining.includes(accountId)) {
          const idx = remaining.indexOf(accountId);
          if (idx > 0) {
            parts.push(remaining.substring(0, idx));
          }
          parts.push({ Ref: 'AWS::AccountId' });
          remaining = remaining.substring(idx + accountId.length);
        }

        // Replace regions in remaining string
        let temp = remaining;
        remaining = '';
        while (temp.includes(region) && !temp.match(new RegExp(`${region}[a-z]`))) {
          const idx = temp.indexOf(region);
          if (idx > 0) {
            remaining += temp.substring(0, idx);
          }
          if (remaining) {
            parts.push(remaining);
            remaining = '';
          }
          parts.push({ Ref: 'AWS::Region' });
          temp = temp.substring(idx + region.length);
        }
        if (temp) {
          remaining += temp;
        }

        if (remaining) {
          parts.push(remaining);
        }

        // If we split into multiple parts, return array, otherwise return the modified string
        if (parts.length > 1) {
          return parts;
        }
      }

      // For Fn::Sub context, use ${AWS::Region} format
      let result = obj;
      let hasReplacement = false;
      
      if (result.includes(accountId)) {
        result = result.replace(new RegExp(accountId, 'g'), '${AWS::AccountId}');
        hasReplacement = true;
      }

      // Replace hardcoded region (but not in AZ context)
      if (result.includes(region) && !result.match(new RegExp(`${region}[a-z]`))) {
        result = result.replace(new RegExp(region, 'g'), '${AWS::Region}');
        hasReplacement = true;
      }

      // If no replacements were made, return original
      if (!hasReplacement) {
        return result;
      }

      // If the result is ONLY a pseudo-parameter reference (no other text), convert to Ref
      if (result === '${AWS::AccountId}') {
        return { Ref: 'AWS::AccountId' };
      }
      if (result === '${AWS::Region}') {
        return { Ref: 'AWS::Region' };
      }

      // If the result contains pseudo-parameters mixed with other text, wrap in Fn::Sub
      // But only if we're not already inside an Fn::Sub context
      if (result.includes('${AWS::') && parentKey !== 'Fn::Sub') {
        return { 'Fn::Sub': result };
      }

      return result;
    }
    if (Array.isArray(obj)) {
      // Check if parent is Fn::Join
      const isFnJoinArray = parentKey === 'Fn::Join';
      const mapped = obj.map((item, idx) => {
        // Second element of Fn::Join array is the parts to join
        const isJoinParts = isFnJoinArray && idx === 1;
        return replaceHardcodedValues(item, region, accountId, parentKey, isJoinParts);
      });

      // Flatten if we're in Fn::Join parts and got nested arrays
      if (parentKey === 'Fn::Join' && Array.isArray(mapped[1])) {
        const flattened = [];
        for (const item of mapped[1]) {
          if (Array.isArray(item)) {
            flattened.push(...item);
          } else {
            flattened.push(item);
          }
        }
        return [mapped[0], flattened];
      }

      return mapped;
    }
    if (obj !== null && typeof obj === 'object') {
      const newObj = {};
      for (const [key, value] of Object.entries(obj)) {
        const replaced = replaceHardcodedValues(value, region, accountId, key, isInFnJoin);
        // If AvailabilityZone was converted to Fn::Select, use it directly
        if (key === 'AvailabilityZone' && typeof replaced === 'object' && replaced['Fn::Select']) {
          newObj[key] = replaced;
        } else {
          newObj[key] = replaced;
        }
      }
      return newObj;
    }
    return obj;
  };

  // Detect region and account from template
  let detectedRegion = null;
  let detectedAccount = null;

  // Look for region in common resource properties (like VPC, Subnets, etc.)
  const templateStr = JSON.stringify(template);

  // Find all 12-digit account IDs
  const accountMatches = templateStr.match(/\d{12}/g);
  if (accountMatches && accountMatches.length > 0) {
    // Count occurrences to find the most common one
    const accountCounts = {};
    accountMatches.forEach(acc => {
      accountCounts[acc] = (accountCounts[acc] || 0) + 1;
    });
    detectedAccount = Object.keys(accountCounts).sort((a, b) => accountCounts[b] - accountCounts[a])[0];
  }

  // Find region from availability zones or ARNs
  const regionMatch = templateStr.match(/(eu-west-\d|us-east-\d|us-west-\d|ap-southeast-\d|ap-northeast-\d|eu-central-\d|ap-south-\d|sa-east-\d|ca-central-\d)/);
  if (regionMatch) {
    detectedRegion = regionMatch[1];
  }

  if (!detectedRegion || !detectedAccount) {
    console.warn('Warning: Could not detect region or account from template. Skipping replacements.');
    console.log(`Template for stack ${stackName} converted successfully (no replacements).`);
    const templatesOutPath = resolve(templatesOutDir, outTemplateFilename);
    await writeJSONFile(template, templatesOutPath);
    console.log(`- Template: ${templatesOutPath}`);
    console.log(`- Assets folder: ${assetsOutDir}`);
    return;
  }

  console.log(`Detected region: ${detectedRegion}, account: ${detectedAccount}`);
  console.log('Replacing hardcoded values with pseudo-parameters...');

  // Apply replacements
  let cleanedTemplate = replaceHardcodedValues(template, detectedRegion, detectedAccount);
  
  // Post-process: Fix any remaining ${AWS::Region} or ${AWS::AccountId} in Fn::Join arrays
  // These should be Ref objects, not strings
  const fixFnJoinStrings = (obj, parentKey = '', inFnJoin = false, grandparentKey = '') => {
    if (typeof obj === 'string') {
      // Only split strings if we're inside a Fn::Join array
      if (inFnJoin && (obj.includes('${AWS::Region}') || obj.includes('${AWS::AccountId}'))) {
        const parts = [];
        let current = obj;
        
        while (current.length > 0) {
          const regionIdx = current.indexOf('${AWS::Region}');
          const accountIdx = current.indexOf('${AWS::AccountId}');
          
          let nextIdx = -1;
          let isRegion = false;
          let replaceStr = '';
          
          if (regionIdx >= 0 && (accountIdx < 0 || regionIdx < accountIdx)) {
            nextIdx = regionIdx;
            isRegion = true;
            replaceStr = '${AWS::Region}';
          } else if (accountIdx >= 0) {
            nextIdx = accountIdx;
            isRegion = false;
            replaceStr = '${AWS::AccountId}';
          }
          
          if (nextIdx < 0) {
            if (current) parts.push(current);
            break;
          }
          
          if (nextIdx > 0) {
            parts.push(current.substring(0, nextIdx));
          }
          
          parts.push({ Ref: isRegion ? 'AWS::Region' : 'AWS::AccountId' });
          current = current.substring(nextIdx + replaceStr.length);
        }
        
        return parts.length > 1 ? parts : obj;
      }
      return obj;
    }
    if (Array.isArray(obj)) {
      const mapped = obj.map(item => fixFnJoinStrings(item, parentKey, inFnJoin, grandparentKey));
      // Flatten if we got nested arrays (only in Fn::Join context)
      if (inFnJoin) {
        const flattened = [];
        for (const item of mapped) {
          if (Array.isArray(item)) {
            flattened.push(...item);
          } else {
            flattened.push(item);
          }
        }
        return flattened;
      }
      return mapped;
    }
    if (obj !== null && typeof obj === 'object') {
      const newObj = {};
      for (const [key, value] of Object.entries(obj)) {
        // Special handling for Fn::Join - fix the second element (the array of parts)
        if (key === 'Fn::Join' && Array.isArray(value) && value.length === 2) {
          newObj[key] = [value[0], fixFnJoinStrings(value[1], key, true, parentKey)];
        } else if (key === 'Value' && grandparentKey === 'Outputs') {
          // Outputs.*.Value that contain ${AWS::Region} or ${AWS::AccountId} should be wrapped in Fn::Sub
          if (typeof value === 'string' && (value.includes('${AWS::Region}') || value.includes('${AWS::AccountId}'))) {
            newObj[key] = { 'Fn::Sub': value };
          } else if (Array.isArray(value)) {
            // Arrays should be wrapped in Fn::Join
            newObj[key] = { 'Fn::Join': ['', value] };
          } else {
            newObj[key] = fixFnJoinStrings(value, key, false, parentKey);
          }
        } else {
          newObj[key] = fixFnJoinStrings(value, key, false, parentKey);
        }
      }
      return newObj;
    }
    return obj;
  };
  
  cleanedTemplate = fixFnJoinStrings(cleanedTemplate, '', false, '');

  // Fix any parameter defaults that contain intrinsic functions (CloudFormation doesn't allow this)
  Object.keys(cleanedTemplate.Parameters).forEach((paramKey) => {
    const param = cleanedTemplate.Parameters[paramKey];
    if (param.Default && typeof param.Default === 'object') {
      // Remove the Default field if it's an intrinsic function
      delete param.Default;
    }
  });

  // Determine output filename mapping for the templates
  let outTemplateFilename = `${cfnTemplateFileNameOut}`;
  if (stackName === 'powertoolsworkshopide') outTemplateFilename = 'powertoolsworkshopide.json';
  if (stackName === 'powertoolsworkshopinfra') outTemplateFilename = 'powertoolsworkshopinfra.json';
  if (stackName === 'powertoolsworkshopservices') outTemplateFilename = 'powertoolsworkshopservices.json';
  if (stackName === 'powertoolsworkshopload') outTemplateFilename = 'powertoolsworkshopload.json';
  // Save modified Cfn template in Workshop/static/cfn
  const templatesOutPath = resolve(templatesOutDir, outTemplateFilename);
  await writeJSONFile(cleanedTemplate, templatesOutPath);

  console.log(`Template for stack ${stackName} converted successfully.`);
  console.log(`- Template: ${templatesOutPath}`);
  console.log(`- Assets folder: ${assetsOutDir}`);
})();
