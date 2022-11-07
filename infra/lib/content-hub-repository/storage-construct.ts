import { Stack, RemovalPolicy } from "aws-cdk-lib";
import { Construct } from "constructs";
import {
  Table,
  AttributeType,
  BillingMode,
  ProjectionType,
} from "aws-cdk-lib/aws-dynamodb";
import {
  Bucket,
  BucketAccessControl,
  BucketEncryption,
  HttpMethods,
} from "aws-cdk-lib/aws-s3";
import { dynamoFilesTableName, dynamoFilesByUserGsiName } from "../constants";
import { IGrantable } from "aws-cdk-lib/aws-iam";

class StorageConstructProps {
  landingZoneBucketName: string;
}

export class StorageConstruct extends Construct {
  public readonly filesTable: Table;
  public readonly landingZoneBucket: Bucket;

  constructor(scope: Construct, id: string, props: StorageConstructProps) {
    super(scope, id);

    const { landingZoneBucketName } = props;

    const commonTableSettings = {
      billingMode: BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: "id", type: AttributeType.STRING },
      removalPolicy: RemovalPolicy.DESTROY,
    };

    this.filesTable = new Table(this, "files-table", {
      tableName: dynamoFilesTableName,
      ...commonTableSettings,
    });

    this.filesTable.addGlobalSecondaryIndex({
      indexName: dynamoFilesByUserGsiName,
      partitionKey: { name: "id", type: AttributeType.STRING },
      sortKey: { name: "userId", type: AttributeType.STRING },
      projectionType: ProjectionType.ALL,
    });

    this.landingZoneBucket = new Bucket(this, "landing-zone", {
      bucketName: landingZoneBucketName,
      transferAcceleration: true,
      accessControl: BucketAccessControl.PRIVATE,
      encryption: BucketEncryption.S3_MANAGED,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      cors: [
        {
          allowedMethods: [HttpMethods.POST, HttpMethods.PUT],
          allowedOrigins: ["*"],
          allowedHeaders: ["*"],
        },
      ],
      eventBridgeEnabled: true,
    });
  }

  public grantReadDataOnTable(grantee: IGrantable) {
    this.filesTable.grantReadData(grantee);
  }

  public grantReadWriteDataOnTable(grantee: IGrantable) {
    this.filesTable.grantReadWriteData(grantee);
  }

  public grantWriteDataOnTable(grantee: IGrantable) {
    this.filesTable.grantWriteData(grantee);
  }

  public grantReadWrite(grantee: IGrantable) {
    this.landingZoneBucket.grantReadWrite(grantee);
  }

  public grantPutOnBucket(grantee: IGrantable) {
    this.landingZoneBucket.grantPut(grantee);
  }

  public grantGetOnBucket(grantee: IGrantable) {
    this.landingZoneBucket.grantRead(grantee);
  }
}
