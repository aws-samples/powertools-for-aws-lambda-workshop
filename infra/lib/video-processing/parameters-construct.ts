import { StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { FailureParameterConstruct } from '../shared/failure-parameter-construct';

export class ParametersConstruct extends Construct {
  public readonly processVideoFailuresString: FailureParameterConstruct;

  public constructor(scope: Construct, id: string, _props: StackProps) {
    super(scope, id);

    this.processVideoFailuresString = new FailureParameterConstruct(
      this,
      'process-video-failures',
      {
        failureMode: 'denylist',
      }
    );
  }
}
