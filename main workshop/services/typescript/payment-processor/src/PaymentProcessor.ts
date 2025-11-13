import { Logger } from '@aws-lambda-powertools/logger';
import { IdempotencyConfig, idempotent } from '@aws-lambda-powertools/idempotency';
import { DynamoDBPersistenceLayer } from '@aws-lambda-powertools/idempotency/dynamodb';
import type { DriverAssignedEvent, PaymentResult } from './models';
import { PaymentService } from './services/PaymentService';

/**
 * This file is part of the Payment Processor service.
 * Update this file in the Module 2 Idempotency exercise.
 */

let logger: Logger;
const config = new IdempotencyConfig({
  eventKeyJmesPath: 'rideId',
});
const persistenceStore = new DynamoDBPersistenceLayer({
  tableName: process.env.IDEMPOTENCY_TABLE_NAME!,
});

export class PaymentProcessor {
  private readonly paymentService: PaymentService;

  constructor(loggerInstance?: Logger) {
    logger = loggerInstance || new Logger();
    this.paymentService = new PaymentService();
  }

  @idempotent({ persistenceStore, config })
  async handlePayment(
    driverEvent: DriverAssignedEvent
  ): Promise<any | null> {
    const result = await this.paymentService.processPayment(driverEvent);

    logger.info("hello", { result });
    logger.info(result.success ? 'Payment succeeded' : 'Payment failed');
    logger.info('Payment processing result', { driverEvent });
    if (result.success) {
      logger.appendKeys({
        amount: result.payment?.amount,
        payment_method: result.payment?.paymentMethod,
        ride_id: result.payment?.rideId,
        payment_id: result.payment?.paymentId,
      });
      logger.info('Payment created');
    }
    return result;
  }
}