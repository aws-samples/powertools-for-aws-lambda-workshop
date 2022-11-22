import { Construct } from 'constructs';
import { ExperimentsConstruct } from './experiments-contruct';
import { CfnDocument } from 'aws-cdk-lib/aws-ssm';
import { readFileSync } from 'fs';
import { parse } from 'yaml';
import { environment } from '../constants';

interface ExperimentsProps {
  [identifier: string]: string
}

export class Experiments extends Construct {
  public constructor(scope: Construct, id: string, props: ExperimentsProps) {
    super(scope, id);

    const parameterStoreContent = readFileSync('lib/chaos-experiments/documents/ssma-put-config-parameterstore.yml', 'utf8');

    const parameterStoreCfnDocument = new CfnDocument(
      this,
      `chaos-experiment-document`,
      {
        name: `ssma-put-config-parameterstore-${environment}`,
        content: parse(parameterStoreContent),
        documentType: 'Automation',
        documentFormat: 'YAML',
      }
    );

    for (const [ experimentName, parameterStoreName ] of Object.entries(props)) {
      new ExperimentsConstruct(this, `experiment-${experimentName}`, {
        ssmAutomationDocumentName: parameterStoreCfnDocument.name as string,
        parameterStoreName,
        experimentName,
      });
    }
  }
}
