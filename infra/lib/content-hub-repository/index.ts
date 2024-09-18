import { Construct } from 'constructs';
import { IUserPool } from 'aws-cdk-lib/aws-cognito';
import { Rule, Match } from 'aws-cdk-lib/aws-events';
import { LambdaFunction } from 'aws-cdk-lib/aws-events-targets';
import { ApiConstruct } from './api-construct.js';
import { FunctionsConstruct } from './functions-construct.js';
import { StorageConstruct } from './storage-construct.js';

interface ContentHubRepoProps {
  userPool: IUserPool;
}

export class ContentHubRepo extends Construct {
  public readonly api: ApiConstruct;
  public readonly functions: FunctionsConstruct;
  public readonly storage: StorageConstruct;

  public constructor(scope: Construct, id: string, props: ContentHubRepoProps) {
    super(scope, id);

    const { userPool } = props;

    this.storage = new StorageConstruct(this, 'storage-construct', {});

    this.functions = new FunctionsConstruct(this, 'functions-construct', {});

    this.storage.grantReadWriteDataOnTable(
      this.functions.getPresignedUploadUrlFn
    );
    this.storage.grantPutOnBucket(this.functions.getPresignedUploadUrlFn);
    this.storage.grantReadDataOnTable(this.functions.getPresignedDownloadUrlFn);
    this.storage.grantGetOnBucket(this.functions.getPresignedDownloadUrlFn);
    this.storage.grantReadWriteDataOnTable(this.functions.cleanDeletedFilesFn);

    this.api = new ApiConstruct(this, 'api-construct', {
      getPresignedUploadUrlFn: this.functions.getPresignedUploadUrlFn,
      getPresignedDownloadUrlFn: this.functions.getPresignedDownloadUrlFn,
      userPool: userPool,
      table: this.storage.filesTable,
    });
    this.api.api.grantMutation(
      this.functions.markCompleteUploadFn,
      'updateFileStatus'
    );
    this.functions.markCompleteUploadFn.addEnvironment(
      'APPSYNC_ENDPOINT',
      `https://${this.api.domain}/graphql`
    );

    const uploadedRule = new Rule(this, 'new-uploads', {
      eventPattern: {
        source: Match.anyOf('aws.s3'),
        detailType: Match.anyOf('Object Created'),
        detail: {
          bucket: {
            name: Match.anyOf(this.storage.landingZoneBucket.bucketName),
          },
          object: { key: Match.prefix('uploads/images/') },
          reason: Match.anyOf('PutObject'),
        },
      },
    });
    uploadedRule.addTarget(
      new LambdaFunction(this.functions.markCompleteUploadFn)
    );

    const deletedRule = new Rule(this, 'deleted-uploads', {
      eventPattern: {
        source: Match.anyOf('aws.s3'),
        detailType: Match.anyOf('Object Removed'),
        detail: {
          bucket: {
            name: Match.anyOf(this.storage.landingZoneBucket.bucketName),
          },
          object: { key: Match.prefix('uploads/images/') },
          reason: Match.anyOf('DeleteObject'),
        },
      },
    });
    deletedRule.addTarget(
      new LambdaFunction(this.functions.markCompleteUploadFn)
    );
  }
}
