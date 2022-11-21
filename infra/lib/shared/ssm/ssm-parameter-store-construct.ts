import { StackProps, aws_ssm as ssm } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {
  environment,
} from '../../constants';
import { StringParameter } from 'aws-cdk-lib/aws-ssm/lib/parameter';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';

interface SSMParameterStoreConstructProps extends StackProps {
  nodeJSLambdaFunction: NodejsFunction
  failureMode: string
  isEnabled?: string
  rate?: string
  minLatency?: string
  maxLatency?: string
}

export class SSMParameterStoreConstruct extends Construct {
  public readonly ssmParameterStore: StringParameter;

  constructor(scope: Construct, id: string, props: SSMParameterStoreConstructProps) {
    super(scope, id);

    this.ssmParameterStore = new ssm.StringParameter(this, `/failure-lambda/${environment}/${id}`, {
      stringValue: `{"isEnabled": false, "failureMode": "denylist", "rate": 1, "denylist": ["dynamodb.*.amazonaws.com"]}`,
    }
    );

    this.ssmParameterStore.grantRead(props.nodeJSLambdaFunction);

  }
}
