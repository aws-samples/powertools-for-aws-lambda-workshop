import type { EventBridgeEvent } from 'aws-lambda';
import type { DriverAssignedEvent } from './models';
import { PaymentProcessor } from './PaymentProcessor';

const paymentProcessor = new PaymentProcessor();

export const handler = async (
  event: EventBridgeEvent<'DriverAssigned', DriverAssignedEvent>
): Promise<void> => {
  try {
    console.log(
      `Processing DriverAssigned event for ride ${event.detail.rideId}`
    );

    const result = await paymentProcessor.handlePayment(event.detail);

    
  } catch (error) {
    console.error(
      '[ERROR] PAYMENT_PROCESSING_ERROR:',
      error instanceof Error ? error.message : error
    );
    throw error;
  }
};