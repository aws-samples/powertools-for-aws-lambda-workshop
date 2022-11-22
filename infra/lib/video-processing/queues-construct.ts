import { StackProps, Duration } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Queue } from 'aws-cdk-lib/aws-sqs';
import { NagSuppressions } from 'cdk-nag';
import { environment } from '../constants';

interface QueuesConstructProps extends StackProps {
  videoProcessingTimeout: Duration
}

export class QueuesConstruct extends Construct {
  public readonly deadLetterQueue: Queue;
  public readonly processingQueue: Queue;

  public constructor(scope: Construct, id: string, props: QueuesConstructProps) {
    super(scope, id);

    const { videoProcessingTimeout } = props;

    this.deadLetterQueue = new Queue(this, 'dead-letter-queue', {
      queueName: `VideoProcessing-DeadLetterQueue-${environment}`,
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
      queueName: `VideoProcessing-Queue-${environment}`,
      deadLetterQueue: {
        maxReceiveCount: 1,
        queue: this.deadLetterQueue,
      },
      visibilityTimeout: videoProcessingTimeout,
    });

    NagSuppressions.addResourceSuppressions(this.processingQueue, [
      {
        id: 'AwsSolutions-SQS4',
        reason: 'Not using SSL intentionally, queue is not public.',
      },
    ]);
  }
}
