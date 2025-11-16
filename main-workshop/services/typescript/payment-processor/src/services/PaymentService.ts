import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  EventBridgeClient,
  PutEventsCommand,
} from '@aws-sdk/client-eventbridge';
import {
  DynamoDBDocumentClient,
  PutCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { captureAWSv3Client } from 'aws-xray-sdk-core';
import type {
  DriverAssignedEvent,
  Payment,
  PaymentCompletedEvent,
  PaymentGatewayResult,
  PaymentResult,
} from '../models';

export class PaymentService {
  private readonly dynamoDbClient: DynamoDBDocumentClient;
  private readonly eventBridgeClient: EventBridgeClient;
  private readonly paymentsTableName: string;
  private readonly eventBusName: string;

  constructor() {
    const client = new DynamoDBClient({});
    this.dynamoDbClient = captureAWSv3Client(
      DynamoDBDocumentClient.from(client)
    );
    this.eventBridgeClient = captureAWSv3Client(new EventBridgeClient({}));
    this.paymentsTableName = process.env.PAYMENTS_TABLE_NAME || 'Payments';
    this.eventBusName = process.env.EVENT_BUS_NAME || '';
  }

  async processPayment(
    driverEvent: DriverAssignedEvent
  ): Promise<PaymentResult> {
    const paymentId = this.generateUUID();

    // Create payment record
    const payment: Payment = {
      paymentId,
      rideId: driverEvent.rideId,
      riderId: driverEvent.riderId,
      driverId: driverEvent.driverId,
      amount: driverEvent.estimatedPrice,
      paymentMethod: driverEvent.paymentMethod,
      status: 'processing',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      correlationId: driverEvent.correlationId,
    };

    try {
      // Save initial payment record
      await this.createPayment(payment);

      // Process payment through gateway
      const gatewayResult = await this.processPaymentGateway(payment);

      // Update payment status based on gateway result
      if (gatewayResult.success) {
        await this.updatePaymentStatus(
          paymentId,
          'completed',
          gatewayResult.transactionId
        );

        // Only publish PaymentCompleted event if payment succeeded
        await this.publishPaymentCompletedEvent({
          eventType: 'PaymentCompleted',
          paymentId,
          rideId: driverEvent.rideId,
          riderId: driverEvent.riderId,
          driverId: driverEvent.driverId,
          amount: payment.amount,
          paymentMethod: payment.paymentMethod,
          transactionId: gatewayResult.transactionId,
          timestamp: new Date().toISOString(),
          correlationId: driverEvent.correlationId,
        });
        return {
          success: gatewayResult.success,
          payment: {
            ...payment,
            status: 'completed',
            transactionId: gatewayResult.transactionId,
          },
          transactionId: gatewayResult.transactionId,
          processingTimeMs: gatewayResult.processingTimeMs,
        };
      }
      // Update status to failed if payment gateway failed
      await this.updatePaymentStatus(
        paymentId,
        'failed',
        undefined,
        gatewayResult.errorMessage
      );
      return {
        success: gatewayResult.success,
        payment: {
          ...payment,
          status: 'failed',
          failureReason: gatewayResult.errorMessage,
        },
        errorMessage: gatewayResult.errorMessage,
        processingTimeMs: gatewayResult.processingTimeMs,
      };
    } catch (error) {
      throw error;
    }
  }

  private async createPayment(payment: Payment): Promise<void> {
    const command = new PutCommand({
      TableName: this.paymentsTableName,
      Item: payment,
    });

    await this.dynamoDbClient.send(command);
  }

  private async updatePaymentStatus(
    paymentId: string,
    status: string,
    transactionId?: string,
    failureReason?: string
  ): Promise<void> {
    let updateExpression = 'SET #status = :status, updatedAt = :updatedAt';
    const expressionAttributeNames: Record<string, string> = {
      '#status': 'status',
    };
    const expressionAttributeValues: Record<string, any> = {
      ':status': status,
      ':updatedAt': new Date().toISOString(),
    };

    if (transactionId) {
      updateExpression += ', transactionId = :transactionId';
      expressionAttributeValues[':transactionId'] = transactionId;
    }

    if (failureReason) {
      updateExpression += ', failureReason = :failureReason';
      expressionAttributeValues[':failureReason'] = failureReason;
    }

    const command = new UpdateCommand({
      TableName: this.paymentsTableName,
      Key: { paymentId },
      UpdateExpression: updateExpression,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
    });

    await this.dynamoDbClient.send(command);
  }

  private async processPaymentGateway(
    payment: Payment
  ): Promise<PaymentGatewayResult> {
    const startTime = Date.now();

    // Simulate payment gateway processing with different delays based on payment method
    const paymentMethod = payment.paymentMethod.toLowerCase();

    if (paymentMethod === 'somecompany-pay') {
      // Simulate longer processing time for SomeCompany Pay
      const delay = 5000;
      await this.sleep(delay);
    } else {
      // Credit card: 100-300ms
      const delay = 100 + Math.floor(Math.random() * 200);
      await this.sleep(delay);
    }

    const processingTime = Date.now() - startTime;

    // Simulate 5% failure rate
    const success = Math.random() >= 0.05;
    const transactionId = success ? `txn_${this.generateShortId()}` : undefined;
    const errorMessage = success
      ? undefined
      : 'Payment gateway declined transaction';

    return {
      success,
      transactionId,
      errorMessage,
      processingTimeMs: processingTime,
    };
  }

  private async publishPaymentCompletedEvent(
    event: PaymentCompletedEvent
  ): Promise<void> {
    if (!this.eventBusName) {
      return;
    }

    const command = new PutEventsCommand({
      Entries: [
        {
          Source: 'payment-processor',
          DetailType: 'PaymentCompleted',
          Detail: JSON.stringify(event),
          EventBusName: this.eventBusName,
        },
      ],
    });

    const result = await this.eventBridgeClient.send(command);

    if (result.FailedEntryCount && result.FailedEntryCount > 0) {
      const error = result.Entries?.[0];
      throw new Error(
        `Failed to publish PaymentCompleted event: ${error?.ErrorCode} - ${error?.ErrorMessage}`
      );
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  private generateShortId(): string {
    return Math.random().toString(36).substring(2, 10);
  }
}
