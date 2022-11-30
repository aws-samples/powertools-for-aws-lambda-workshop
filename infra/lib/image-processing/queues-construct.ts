import { StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Queue } from 'aws-cdk-lib/aws-sqs';
import { Alarm } from 'aws-cdk-lib/aws-cloudwatch';
import { NagSuppressions } from 'cdk-nag';
import { environment } from '../constants';

export class QueuesConstruct extends Construct {
  public readonly deadLetterQueue: Queue;
  public readonly processingQueue: Queue;

  public constructor(scope: Construct, id: string, _props: StackProps) {
    super(scope, id);

    this.deadLetterQueue = new Queue(this, 'dead-letter-queue', {
      queueName: `ImageProcessing-DeadLetterQueue-${environment}`,
    });

    NagSuppressions.addResourceSuppressions(this.deadLetterQueue, [
      {
        id: 'AwsSolutions-SQS3',
        reason:
          'This is already a DLQ, an additional DLQ is redundant.',
      },
      {
        id: 'AwsSolutions-SQS4',
        reason: 'Not using SSL intentionally, queue is not public.',
      },
    ]);

    this.processingQueue = new Queue(this, 'processing-queue', {
      queueName: `ImageProcessing-Queue-${environment}`,
      deadLetterQueue: {
        maxReceiveCount: 3,
        queue: this.deadLetterQueue,
      },
    });

    NagSuppressions.addResourceSuppressions(this.processingQueue, [
      {
        id: 'AwsSolutions-SQS4',
        reason: 'Not using SSL intentionally, queue is not public.',
      },
    ]);

    // TODO: change this
    const metric = this.processingQueue.metric('ApproximateNumberOfMessagesVisible');

    new Alarm(this, 'Alarm', {
      metric: metric,
      threshold: 20000,
      evaluationPeriods: 3,
      datapointsToAlarm: 2,
    });
  }
}
