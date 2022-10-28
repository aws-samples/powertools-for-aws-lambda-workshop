import { Construct } from "constructs";
import { IUserPool, IUserPoolClient } from "aws-cdk-lib/aws-cognito";
import { Rule, Match } from "aws-cdk-lib/aws-events";
import { LambdaFunction } from "aws-cdk-lib/aws-events-targets";
import { AuthConstruct } from "../frontend/auth-construct";
import { ApiConstruct } from "./api-construct";
import { FunctionsConstruct } from "./functions-construct";
import { StorageConstruct } from "./storage-construct";

class ContentHubRepoProps {
  userPool: IUserPool;
  userPoolClient: IUserPoolClient;
  landingZoneBucketName: string;
}

export class ContentHubRepo extends Construct {
  public readonly storage: StorageConstruct;
  public readonly auth: AuthConstruct;
  public readonly api: ApiConstruct;
  public readonly functions: FunctionsConstruct;

  constructor(scope: Construct, id: string, props: ContentHubRepoProps) {
    super(scope, id);

    const { landingZoneBucketName } = props;

    this.storage = new StorageConstruct(this, "storage-construct", {
      landingZoneBucketName,
    });

    this.functions = new FunctionsConstruct(this, "functions-construct", {
      landingZoneBucketName: this.storage.landingZoneBucket.bucketName,
    });

    this.storage.grantReadWriteDataOnTable(this.functions.getPresignedUrlFn);
    this.storage.grantPutOnBucket(this.functions.getPresignedUrlFn);
    this.storage.grantWriteDataOnTable(this.functions.markCompleteUploadFn);

    this.api = new ApiConstruct(this, "api-construct", {
      getPresignedUrlFn: this.functions.getPresignedUrlFn,
      userPool: props.userPool,
      userPoolClient: props.userPoolClient,
    });

    const uploadedRule = new Rule(this, "new-uploads", {
      eventPattern: {
        source: Match.anyOf("aws.s3"),
        detailType: Match.anyOf("Object Created"),
        detail: {
          bucket: {
            name: Match.anyOf(this.storage.landingZoneBucket.bucketName),
          },
          object: { key: Match.prefix("uploads/") },
          reason: Match.anyOf("PutObject"),
        },
      },
    });
    uploadedRule.addTarget(
      new LambdaFunction(this.functions.markCompleteUploadFn)
    );
  }
}
