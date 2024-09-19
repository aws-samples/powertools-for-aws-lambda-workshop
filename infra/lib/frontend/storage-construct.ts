import { Stack, RemovalPolicy, CfnOutput } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {
  Bucket,
  BucketAccessControl,
  BucketEncryption,
} from 'aws-cdk-lib/aws-s3';
import { websiteBucketNamePrefix, environment } from '../constants.js';
import { NagSuppressions } from 'cdk-nag';

class StorageConstructProps {}

export class StorageConstruct extends Construct {
  public readonly websiteBucket: Bucket;

  public constructor(
    scope: Construct,
    id: string,
    _props?: StorageConstructProps
  ) {
    super(scope, id);

    this.websiteBucket = new Bucket(this, 'website', {
      bucketName: `${websiteBucketNamePrefix}-${
        Stack.of(this).account
      }-${environment}`,
      accessControl: BucketAccessControl.PRIVATE,
      encryption: BucketEncryption.S3_MANAGED,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    NagSuppressions.addResourceSuppressions(this.websiteBucket, [
      {
        id: 'AwsSolutions-S1',
        reason:
          "This bucket is deployed as part of an AWS workshop and as such it's short-lived.",
      },
      {
        id: 'AwsSolutions-S2',
        reason:
          'This bucket uses CDK default settings which block public access and allows for overriding, in this case from CloudFormation distribution.',
      },
    ]);

    NagSuppressions.addResourceSuppressions(
      this.websiteBucket,
      [
        {
          id: 'AwsSolutions-S10',
          reason:
            'This bucket is deployed as part of an AWS workshop. It already uses CloudFront with redirect to HTTPS.',
        },
      ],
      true
    );

    new CfnOutput(this, 'WebsiteBucketName', {
      value: this.websiteBucket.bucketName,
      exportName: `${Stack.of(this).stackName}-WebsiteBucketName${
        environment === 'prod' ? `-prod` : ''
      }`,
    });
  }
}
