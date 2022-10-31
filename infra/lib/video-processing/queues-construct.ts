import { StackProps, Stack, Duration } from "aws-cdk-lib";
import { Construct } from "constructs";
import { Queue } from "aws-cdk-lib/aws-sqs";
import { environment } from "../constants";

interface QueuesConstructProps extends StackProps {
  videoProcessingTimeout: Duration;
}

export class QueuesConstruct extends Construct {
  public readonly processingQueue: Queue;
  public readonly deadLetterQueue: Queue;

  constructor(scope: Construct, id: string, props: QueuesConstructProps) {
    super(scope, id);

    const { videoProcessingTimeout } = props;

    this.deadLetterQueue = new Queue(this, "dead-letter-queue", {
      queueName: `VideoProcessing-DeadLetterQueue-${
        Stack.of(this).account
      }-${environment}`,
    });

    this.processingQueue = new Queue(this, "processing-queue", {
      queueName: `VideoProcessing-Queue-${
        Stack.of(this).account
      }-${environment}`,
      deadLetterQueue: {
        maxReceiveCount: 1,
        queue: this.deadLetterQueue,
      },
      visibilityTimeout: videoProcessingTimeout,
    });
  }
}
