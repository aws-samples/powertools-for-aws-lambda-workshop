import { Duration, RemovalPolicy, Stack } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {
  Table,
  AttributeType,
  BillingMode,
  ProjectionType,
  StreamViewType,
} from 'aws-cdk-lib/aws-dynamodb';
import {
  BlockPublicAccess,
  Bucket,
  BucketAccessControl,
  BucketEncryption,
  HttpMethods,
} from 'aws-cdk-lib/aws-s3';
import {
  landingZoneBucketNamePrefix,
  environment,
  dynamoFilesTableName,
  dynamoFilesByUserGsiName,
} from '../constants.js';
import { IGrantable } from 'aws-cdk-lib/aws-iam';
import { NagSuppressions } from 'cdk-nag';

interface StorageConstructProps {}

export class StorageConstruct extends Construct {
  public readonly filesTable: Table;
  public readonly landingZoneBucket: Bucket;

  public constructor(
    scope: Construct,
    id: string,
    _props: StorageConstructProps
  ) {
    super(scope, id);

    const commonTableSettings = {
      billingMode: BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: 'id', type: AttributeType.STRING },
      removalPolicy: RemovalPolicy.DESTROY,
    };

    this.filesTable = new Table(this, 'files-table', {
      tableName: dynamoFilesTableName,
      stream: StreamViewType.NEW_IMAGE,
      timeToLiveAttribute: 'ttl',
      ...commonTableSettings,
    });

    this.filesTable.addGlobalSecondaryIndex({
      indexName: dynamoFilesByUserGsiName,
      partitionKey: { name: 'id', type: AttributeType.STRING },
      sortKey: { name: 'userId', type: AttributeType.STRING },
      projectionType: ProjectionType.ALL,
    });

    NagSuppressions.addResourceSuppressions(this.filesTable, [
      {
        id: 'AwsSolutions-DDB3',
        reason:
          "No point-in-time recovery needed for this table, it's for a short-lived workshop.",
      },
    ]);

    this.landingZoneBucket = new Bucket(this, 'landing-zone', {
      bucketName: `${landingZoneBucketNamePrefix}-${
        Stack.of(this).account
      }-${environment}`,
      transferAcceleration: true,
      accessControl: BucketAccessControl.PRIVATE,
      encryption: BucketEncryption.S3_MANAGED,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      cors: [
        {
          allowedMethods: [HttpMethods.POST, HttpMethods.PUT],
          allowedOrigins: ['*'],
          allowedHeaders: ['*'],
        },
      ],
      eventBridgeEnabled: true,
      lifecycleRules: [
        {
          expiration: Duration.days(1),
          prefix: 'uploads/',
        },
      ],
    });

    NagSuppressions.addResourceSuppressions(this.landingZoneBucket, [
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
      this.landingZoneBucket,
      [
        {
          id: 'AwsSolutions-S10',
          reason:
            'This bucket is deployed as part of an AWS workshop. It already uses CloudFront with redirect to HTTPS.',
        },
      ],
      true
    );
  }

  public grantGetOnBucket(grantee: IGrantable): void {
    this.landingZoneBucket.grantRead(grantee);
  }

  public grantPutOnBucket(grantee: IGrantable): void {
    this.landingZoneBucket.grantPut(grantee);
  }

  public grantReadDataOnTable(grantee: IGrantable): void {
    this.filesTable.grantReadData(grantee);
  }

  public grantReadWrite(grantee: IGrantable): void {
    this.landingZoneBucket.grantReadWrite(grantee);
  }

  public grantReadWriteDataOnTable(grantee: IGrantable): void {
    this.filesTable.grantReadWriteData(grantee);
  }

  public grantWriteDataOnTable(grantee: IGrantable): void {
    this.filesTable.grantWriteData(grantee);
  }
}
