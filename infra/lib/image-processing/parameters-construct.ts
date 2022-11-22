import { StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { FailureParameterConstruct } from '../shared/failure-parameter-construct';

export class ParametersConstruct extends Construct {
  public readonly processImageFailuresString: FailureParameterConstruct;

  public constructor(scope: Construct, id: string, _props: StackProps) {
    super(scope, id);

    this.processImageFailuresString = new FailureParameterConstruct(
      this,
      'process-image-failures',
      {
        failureMode: 'denylist',
      }
    );
  }
}
