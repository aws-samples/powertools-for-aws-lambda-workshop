import type { EventBridgeEvent } from 'aws-lambda';
import type { DriverAssignedEvent } from './models';
import { PaymentProcessor } from './PaymentProcessor';

const paymentProcessor = new PaymentProcessor();

export const handler = async (
  event: EventBridgeEvent<'DriverAssigned', DriverAssignedEvent>
): Promise<void> => {
  try {
    const result = await paymentProcessor.handlePayment(event.detail);
    if (result.success) {
      console.log(
        `Payment completed successfully: ${result.payment?.paymentId ?? 'N/A'} for ${result.payment?.amount ?? 'N/A'}`
      );
    } else {
      console.log(`Payment failed: ${result.errorMessage}`);
    }
  } catch (error) {
    console.error('[ERROR] PAYMENT_PROCESSING_ERROR:', error);
    throw error;
  }
};
