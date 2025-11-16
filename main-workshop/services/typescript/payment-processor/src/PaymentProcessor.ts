import { Logger } from '@aws-lambda-powertools/logger';
import type { DriverAssignedEvent, PaymentResult } from './models';
import { PaymentService } from './services/PaymentService';

/**
 * This file is part of the Payment Processor service.
 * Update this file in the Module 2 Idempotency exercise.
 */

let logger: Logger;

export class PaymentProcessor {
  private readonly paymentService: PaymentService;

  constructor(loggerInstance?: Logger) {
    logger = loggerInstance || new Logger();
    this.paymentService = new PaymentService();
  }

  async handlePayment(
    driverEvent: DriverAssignedEvent
  ): Promise<PaymentResult> {
    const result = await this.paymentService.processPayment(driverEvent);

    logger.info('Payment processing result', { result });

    if (result.success && result.payment) {
      logger.info('Payment created', {
        ride_id: result.payment?.rideId,
        payment_id: result.payment?.paymentId,
        payment_amount: result.payment?.amount,
        payment_method: result.payment?.paymentMethod,
      });
    }
    return result;
  }
}
