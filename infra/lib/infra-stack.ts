import { Stack, StackProps, RemovalPolicy } from "aws-cdk-lib";
import { Construct } from "constructs";
import {
  Bucket,
  BucketAccessControl,
  BucketEncryption,
  HttpMethods,
  EventType,
} from "aws-cdk-lib/aws-s3";
import {
  SnsDestination,
  LambdaDestination,
} from "aws-cdk-lib/aws-s3-notifications";
import { Topic } from "aws-cdk-lib/aws-sns";
import { AuthConstruct } from "./auth-construct";
import { ApiConstruct } from "./api-construct";
import { FunctionsConstruct } from "./functions-construct";
import { DistributionConstruct } from "./distribution-construct";
import { StorageConstruct } from "./storage-construct";

export class InfraStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const uploadTopic = new Topic(this, "upload-topic");

    const bucket = new Bucket(this, "landing-zone", {
      transferAcceleration: true,
      accessControl: BucketAccessControl.PRIVATE,
      encryption: BucketEncryption.S3_MANAGED,
      removalPolicy: RemovalPolicy.DESTROY,
      cors: [
        {
          allowedMethods: [HttpMethods.POST, HttpMethods.PUT],
          allowedOrigins: ["*"],
          allowedHeaders: ["*"],
        },
      ],
    });
    /* bucket.addEventNotification(
      EventType.OBJECT_CREATED_PUT,
      new SnsDestination(uploadTopic),
      {
        prefix: "uploads/*",
      }
    ); */

    const {
      preSignUpCognitoTriggerFn,
      getPresignedUrlFn,
      markCompleteUploadFn,
    } = new FunctionsConstruct(this, "functions-construct", {
      bucketName: bucket.bucketName,
    });
    bucket.grantPut(getPresignedUrlFn);
    bucket.addEventNotification(
      EventType.OBJECT_CREATED_PUT,
      new LambdaDestination(markCompleteUploadFn),
      {
        prefix: "uploads/*",
      }
    );

    const { userPool, userPoolClient } = new AuthConstruct(
      this,
      "auth-construct",
      {
        preSignUpCognitoTriggerFn,
      }
    );

    const { api } = new ApiConstruct(this, "api-construct", {
      getPresignedUrlFn,
      userPool,
      userPoolClient,
    });

    const { filesTable } = new StorageConstruct(this, "storage-construct", {});
    filesTable.grantReadWriteData(getPresignedUrlFn);
    filesTable.grantWriteData(markCompleteUploadFn);

    new DistributionConstruct(this, "distribution-construct", {
      bucket,
      domain: api.apiEndpoint,
    });
  }
}
