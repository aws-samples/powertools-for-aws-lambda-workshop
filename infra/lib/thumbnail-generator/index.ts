import { Construct } from 'constructs';
import { Rule, Match } from 'aws-cdk-lib/aws-events';
import { LambdaFunction } from 'aws-cdk-lib/aws-events-targets';
import { FunctionsConstruct } from './functions-construct';
import { QueuesConstruct } from './queues-construct';
import { StorageConstruct } from './storage-construct';

interface ThumbnailGeneratorProps {
  landingZoneBucketName: string;
}

export class ThumbnailGenerator extends Construct {
  public readonly functions: FunctionsConstruct;
  public readonly queues: QueuesConstruct;
  public readonly storage: StorageConstruct;

  public constructor(
    scope: Construct,
    id: string,
    props: ThumbnailGeneratorProps
  ) {
    super(scope, id);

    const { landingZoneBucketName } = props;

    this.functions = new FunctionsConstruct(this, 'functions-construct', {
      landingZoneBucketName,
    });

    this.queues = new QueuesConstruct(this, 'queues-construct', {});

    this.storage = new StorageConstruct(this, 'storage-construct', {});
    this.storage.grantReadWriteDataOnTable(this.functions.thumbnailGeneratorFn);

    const thumbnailGeneratorRule = new Rule(
      this,
      'thumbnail-generator-process',
      {
        eventPattern: {
          source: Match.anyOf('aws.s3'),
          detailType: Match.anyOf('Object Created'),
          detail: {
            bucket: {
              name: Match.anyOf(landingZoneBucketName),
            },
            object: {
              key: Match.anyOf(
                Match.prefix('uploads/image/jpeg'),
                Match.prefix('uploads/image/png')
              ),
            },
            reason: Match.anyOf('PutObject'),
          },
        },
      }
    );
    thumbnailGeneratorRule.addTarget(
      new LambdaFunction(this.functions.thumbnailGeneratorFn, {
        retryAttempts: 1,
        deadLetterQueue: this.queues.deadLetterQueue,
      })
    );
  }
}
