import { Construct } from 'constructs';
import { ExperimentsConstruct } from './experiments-contruct';
import { aws_ssm as ssm } from 'aws-cdk-lib';
import path from 'path';
import fs from 'fs';
// @ts-ignore
import yaml from 'js-yaml';

type ExperimentsProps = {
  [identifier: string]: string
};

export class Experiments extends Construct {

  public readonly experiments: ExperimentsConstruct[];

  constructor(scope: Construct, id: string, props: ExperimentsProps) {
    super(scope, id);

    // FIS experiments
    // Source: https://github.com/adhorn/aws-fis-templates-cdk/blob/main/lib/fis-experiments/lambda-faults/experiments-stack.ts

    const file = path.join(__dirname, 'documents/ssma-put-config-parameterstore.yml');

    const parameterStoreContent = fs.readFileSync(file, 'utf8');

    const parameterStoreCfnDocument = new ssm.CfnDocument(
      this,
      `chaos-experiment-document`,
      {
        content: yaml.load(parameterStoreContent),
        documentType: 'Automation',
        documentFormat: 'YAML',
      }
    );

    this.experiments = [];

    for (const identifier in props) {
      this.experiments.push(new ExperimentsConstruct(this, `${identifier}-experiment`, {
        ssmAutomationDocumentName: parameterStoreCfnDocument.ref!.toString(),
        parameterStoreName: props[identifier]
      }));
    }

  }
}
