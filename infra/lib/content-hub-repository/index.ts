import { Construct } from "constructs";
import { IUserPool, IUserPoolClient } from "aws-cdk-lib/aws-cognito";
import { AuthConstruct } from "../frontend/auth-construct";
import { ApiConstruct } from "./api-construct";
import { FunctionsConstruct } from "./functions-construct";
import { StorageConstruct } from "./storage-construct";

class ContentHubRepoProps {
  userPool: IUserPool;
  userPoolClient: IUserPoolClient;
}

export class ContentHubRepo extends Construct {
  public readonly storage: StorageConstruct;
  public readonly auth: AuthConstruct;
  public readonly api: ApiConstruct;
  public readonly functions: FunctionsConstruct;

  constructor(scope: Construct, id: string, props: ContentHubRepoProps) {
    super(scope, id);

    this.storage = new StorageConstruct(this, "storage-construct", {});

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
      table: this.storage.filesTable,
    });
  }
}
