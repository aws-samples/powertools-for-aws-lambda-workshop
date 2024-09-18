import { StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Queue } from 'aws-cdk-lib/aws-sqs';
import { Alarm } from 'aws-cdk-lib/aws-cloudwatch';
import { NagSuppressions } from 'cdk-nag';
import { environment } from '../constants.js';

export class QueuesConstruct extends Construct {
  public readonly deadLetterQueue: Queue;

  public constructor(scope: Construct, id: string, _props: StackProps) {
    super(scope, id);

    this.deadLetterQueue = new Queue(this, 'dead-letter-queue', {
      queueName: `ImageDetection-DeadLetterQueue-${environment}`,
      enforceSSL: true,
    });

    NagSuppressions.addResourceSuppressions(this.deadLetterQueue, [
      {
        id: 'AwsSolutions-SQS3',
        reason: 'This is already a DLQ, an additional DLQ would be redundant.',
      },
      {
        id: 'AwsSolutions-SQS4',
        reason: 'Not using SSL intentionally, queue is not public.',
      },
    ]);

    const metric = this.deadLetterQueue.metric(
      'ApproximateNumberOfMessagesVisible'
    );

    new Alarm(this, 'Alarm', {
      metric: metric,
      threshold: 100,
      evaluationPeriods: 3,
      datapointsToAlarm: 2,
    });
  }
}
