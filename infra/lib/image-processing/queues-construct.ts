import { StackProps, Stack, aws_cloudwatch as cloudwatch } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Queue } from 'aws-cdk-lib/aws-sqs';
import { environment } from '../constants';

type QueuesConstructProps = StackProps;

export class QueuesConstruct extends Construct {
  public readonly processingQueue: Queue;
  public readonly deadLetterQueue: Queue;

  constructor(scope: Construct, id: string, props: QueuesConstructProps) {
    super(scope, id);

    this.deadLetterQueue = new Queue(this, 'dead-letter-queue', {
      queueName: `ImageProcessing-DeadLetterQueue-${
        Stack.of(this).account
      }-${environment}`,
    });

    this.processingQueue = new Queue(this, 'processing-queue', {
      queueName: `ImageProcessing-Queue-${
        Stack.of(this).account
      }-${environment}`,
      deadLetterQueue: {
        maxReceiveCount: 1,
        queue: this.deadLetterQueue,
      },
    });

    // TODO: change this
    const metric = this.processingQueue.metric('ApproximateNumberOfMessagesVisible');

    const alarm = new cloudwatch.Alarm(this, 'Alarm', {
      metric: metric,
      threshold: 20000,
      evaluationPeriods: 3,
      datapointsToAlarm: 2,
    });
  }
}
