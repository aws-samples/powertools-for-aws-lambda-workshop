import { Stack, type StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Rule, Match } from 'aws-cdk-lib/aws-events';
import { LambdaFunction } from 'aws-cdk-lib/aws-events-targets';
import { FunctionsConstruct } from './functions-construct.js';
import { QueuesConstruct } from './queues-construct.js';
import { StorageConstruct } from './storage-construct.js';
import {
  type Language,
  environment,
  landingZoneBucketNamePrefix,
} from '../constants.js';

interface ThumbnailGeneratorProps extends StackProps {
  language: Language;
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

    const { language } = props;

    const filesBucketName = `${landingZoneBucketNamePrefix}-${
      Stack.of(this).account
    }-${environment}`;

    this.functions = new FunctionsConstruct(this, 'functions-construct', {
      language,
    });

    this.queues = new QueuesConstruct(this, 'queues-construct', {});

    this.storage = new StorageConstruct(this, 'storage-construct', {});
    this.storage.grantReadWriteDataOnTable(this.functions.thumbnailGeneratorFn);
    this.functions.thumbnailGeneratorFn.addEnvironment(
      'IDEMPOTENCY_TABLE_NAME',
      this.storage.idempotencyTable.tableName
    );

    const thumbnailGeneratorRule = new Rule(
      this,
      'thumbnail-generator-process',
      {
        eventPattern: {
          source: Match.anyOf('aws.s3'),
          detailType: Match.anyOf('Object Created'),
          detail: {
            bucket: {
              name: Match.anyOf(filesBucketName),
            },
            object: {
              key: Match.anyOf(
                Match.prefix('uploads/images/jpg'),
                Match.prefix('uploads/images/png')
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
