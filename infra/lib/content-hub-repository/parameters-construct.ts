import { StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { FailureParameterConstruct } from '../shared/failure-parameter-construct';

export class ParametersConstruct extends Construct {
  public readonly getDownloadUrlFailuresString: FailureParameterConstruct;
  public readonly getUploadUrlFailuresString: FailureParameterConstruct;

  public constructor(scope: Construct, id: string, _props: StackProps) {
    super(scope, id);

    this.getUploadUrlFailuresString = new FailureParameterConstruct(
      this,
      'get-upload-url-failures',
      {
        failureMode: 'denylist',
      }
    );

    this.getDownloadUrlFailuresString = new FailureParameterConstruct(
      this,
      'get-download-url-failures',
      {
        failureMode: 'denylist',
      }
    );
  }
}
