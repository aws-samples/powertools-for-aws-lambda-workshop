import { StackProps, Stack } from "aws-cdk-lib";
import { Construct } from "constructs";
import { Queue } from "aws-cdk-lib/aws-sqs";
import { environment } from "../constants";

interface QueuesConstructProps extends StackProps {}

export class QueuesConstruct extends Construct {
  public readonly processingQueue: Queue;
  public readonly deadLetterQueue: Queue;

  constructor(scope: Construct, id: string, props: QueuesConstructProps) {
    super(scope, id);

    this.deadLetterQueue = new Queue(this, "dead-letter-queue", {
      queueName: `ImageProcessing-DeadLetterQueue-${
        Stack.of(this).account
      }-${environment}`,
    });

    this.processingQueue = new Queue(this, "processing-queue", {
      queueName: `ImageProcessing-Queue-${
        Stack.of(this).account
      }-${environment}`,
      deadLetterQueue: {
        maxReceiveCount: 1,
        queue: this.deadLetterQueue,
      },
    });
  }
}
