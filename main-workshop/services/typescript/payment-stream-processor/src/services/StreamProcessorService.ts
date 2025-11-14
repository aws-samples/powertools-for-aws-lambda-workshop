import {
  EventBridgeClient,
  PutEventsCommand,
} from '@aws-sdk/client-eventbridge';
import type { AttributeValue, DynamoDBRecord } from 'aws-lambda';
import { captureAWSv3Client } from 'aws-xray-sdk-core';
import {
  BatchException,
  type PaymentCompletedEvent,
  type PaymentStreamEvent,
} from '../models';

export class StreamProcessorService {
  private eventBridge: EventBridgeClient;
  private eventBusName: string;

  constructor() {
    this.eventBridge = captureAWSv3Client(new EventBridgeClient({}));
    this.eventBusName = process.env.EVENT_BUS_NAME || '';
  }

  /**
   * Extract record metadata without processing (safe operation that shouldn't fail)
   */
  async extractRecord(record: DynamoDBRecord): Promise<PaymentStreamEvent> {
    // Simulate expensive API call with 500ms latency
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Extract payment data from the stream record
    const newImage = record.dynamodb?.NewImage;

    if (!newImage) {
      throw new Error('No NewImage found in DynamoDB stream record');
    }

    // Extract business context for logging
    const paymentId = this.getAttributeValue(newImage, 'paymentId');
    const rideId = this.getAttributeValue(newImage, 'rideId');
    const riderId = this.getAttributeValue(newImage, 'riderId');
    const driverId = this.getAttributeValue(newImage, 'driverId');
    const correlationId = this.getAttributeValue(newImage, 'correlationId');
    const amount = this.getAttributeValue(newImage, 'amount');
    const paymentMethod = this.getAttributeValue(newImage, 'paymentMethod');
    const transactionId = this.getAttributeValue(newImage, 'transactionId');
    const status = this.getAttributeValue(newImage, 'status');

    return {
      success: true,
      paymentId,
      rideId,
      riderId,
      driverId,
      correlationId,
      amount,
      paymentMethod,
      transactionId,
      status,
    };
  }

  async processSingleRecordAsync(
    extractedData: PaymentStreamEvent
  ): Promise<PaymentStreamEvent> {
    // FAILURE SCENARIO: Simulate poison records (records that always fail)
    // Check for a special "poison" payment ID that always causes failures
    if (extractedData.paymentId?.includes('POISON')) {
      throw new BatchException(
        `Poison record detected: ${extractedData.paymentId}`,
        extractedData
      );
    }

    await this.processPaymentCompletionAsync(extractedData);
    return extractedData;
  }

  private async processPaymentCompletionAsync(
    extractedData: PaymentStreamEvent
  ): Promise<void> {
    // Skip test/synthetic data first (before any processing)
    if (!this.eventBusName || extractedData.riderId === 'rider-batch-test') {
      return;
    }

    // Only process payments with 'completed' status
    if (extractedData.status !== 'completed') {
      // Skip failed or processing payments - don't send completion events
      return;
    }

    // Parse amount to decimal for proper JSON serialization
    const amountDecimal = Number.parseFloat(extractedData.amount || '0');
    if (isNaN(amountDecimal)) {
      throw new Error(`Invalid amount format: ${extractedData.amount}`);
    }

    const completionEvent: PaymentCompletedEvent = {
      EventType: 'PaymentCompleted',
      PaymentId: extractedData.paymentId,
      RideId: extractedData.rideId,
      RiderId: extractedData.riderId,
      DriverId: extractedData.driverId,
      Amount: amountDecimal,
      PaymentMethod: extractedData.paymentMethod,
      TransactionId: extractedData.transactionId,
      Timestamp: new Date().toISOString(),
      CorrelationId: extractedData.correlationId,
    };

    await this.sendEventToEventBridge('PaymentCompleted', completionEvent);
  }

  /**
   * Send event to EventBridge
   */
  private async sendEventToEventBridge(
    detailType: string,
    eventDetail: PaymentCompletedEvent
  ): Promise<void> {
    const eventDetailJson = JSON.stringify(eventDetail);

    const command = new PutEventsCommand({
      Entries: [
        {
          Source: 'payment-stream-processor',
          DetailType: detailType,
          Detail: eventDetailJson,
          EventBusName: this.eventBusName,
        },
      ],
    });

    const result = await this.eventBridge.send(command);

    const failedEntries = result.Entries?.filter((e) => e.ErrorCode) || [];
    if (failedEntries.length > 0) {
      throw new Error(`Failed to send event: ${failedEntries[0].ErrorCode}`);
    }
  }

  private getAttributeValue(
    attributes: Record<string, AttributeValue>,
    key: string
  ): string | undefined {
    const attribute = attributes[key];
    if (!attribute) {
      return undefined;
    }

    return attribute.S || attribute.N;
  }
}
