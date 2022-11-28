import { StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';
import { IGrantable } from 'aws-cdk-lib/aws-iam';
import { environment } from '../constants';

interface FailureParameterConstructProps extends StackProps {
  failureMode: string
  isEnabled?: string
  rate?: string
  minLatency?: string
  maxLatency?: string
}

export class FailureParameterConstruct extends Construct {
  public readonly stringParameter: StringParameter;

  public constructor(
    scope: Construct,
    id: string,
    props: FailureParameterConstructProps
  ) {
    super(scope, id);

    const { failureMode, rate, minLatency, maxLatency, isEnabled } = props;

    this.stringParameter = new StringParameter(
      this,
      `chaor-string-parameter-${id}`,
      {
        parameterName: `chaos-${id}-${environment}`,
        stringValue: JSON.stringify({
          "isEnabled": isEnabled || false,
          "failureMode": failureMode || "exception",
          "rate": rate || 1,
          "minLatency": minLatency || 100,
          "maxLatency": maxLatency || 1000,
          "exceptionMsg": "Unexpected error occurred while trying to connect to DynamoDB",
          "statusCode": 404,
          "diskSpace": 100,
          "denylist": [
            "dynamodb.*.amazonaws.com"
          ]
        }),
      }
    );
  }

  public grantRead(grantee: IGrantable): void {
    this.stringParameter.grantRead(grantee);
  }
}
