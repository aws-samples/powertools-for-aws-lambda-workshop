import { Stack, RemovalPolicy, CfnOutput } from "aws-cdk-lib";
import { Construct } from "constructs";
import {
  Bucket,
  BucketAccessControl,
  BucketEncryption,
} from "aws-cdk-lib/aws-s3";
import { websiteBucketNamePrefix, environment } from "../constants";

class StorageConstructProps {}

export class StorageConstruct extends Construct {
  public readonly websiteBucket: Bucket;

  constructor(scope: Construct, id: string, _props?: StorageConstructProps) {
    super(scope, id);

    this.websiteBucket = new Bucket(this, "website", {
      bucketName: `${websiteBucketNamePrefix}-${
        Stack.of(this).account
      }-${environment}`,
      accessControl: BucketAccessControl.PRIVATE,
      encryption: BucketEncryption.S3_MANAGED,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    new CfnOutput(this, "WebsiteBucketName", {
      value: this.websiteBucket.bucketName,
    });
  }
}
