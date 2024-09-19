import type { Table } from 'aws-cdk-lib/aws-dynamodb';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import {
  FilterCriteria,
  FilterRule,
  StartingPosition,
} from 'aws-cdk-lib/aws-lambda';
import { SqsDestination } from 'aws-cdk-lib/aws-lambda-destinations';
import { DynamoEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import type { Bucket } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import { FunctionsConstruct } from './functions-construct.js';
import { QueuesConstruct } from './queues-construct.js';
import { type Language } from '../constants.js';

interface ImageDetectionProps {
  filesBucket: Bucket;
  filesTable: Table;
  language: Language;
}

export class ImageDetection extends Construct {
  public readonly functions: FunctionsConstruct;
  public readonly queues: QueuesConstruct;

  public constructor(scope: Construct, id: string, props: ImageDetectionProps) {
    super(scope, id);

    const { filesBucket, filesTable, language } = props;

    this.functions = new FunctionsConstruct(this, 'functions-construct', {
      landingZoneBucketName: filesBucket.bucketName,
      language,
    });
    this.functions.imageDetectionFn.addToRolePolicy(
      new PolicyStatement({
        actions: ['rekognition:DetectLabels'],
        resources: ['*'],
      })
    );
    filesBucket.grantRead(this.functions.imageDetectionFn);
    this.functions.imageDetectionFn.addEnvironment(
      'BUCKET_NAME_FILES',
      filesBucket.bucketName
    );

    this.queues = new QueuesConstruct(this, 'queues-construct', {});

    this.functions.imageDetectionFn.addEventSource(
      new DynamoEventSource(filesTable, {
        startingPosition: StartingPosition.LATEST,
        reportBatchItemFailures: true,
        onFailure: new SqsDestination(this.queues.deadLetterQueue),
        batchSize: 100,
        retryAttempts: 3,
        filters: [
          FilterCriteria.filter({
            eventName: FilterRule.isEqual('MODIFY'),
            dynamodb: {
              NewImage: {
                status: {
                  S: FilterRule.isEqual('completed'),
                },
              },
            },
          }),
        ],
      })
    );
  }
}
