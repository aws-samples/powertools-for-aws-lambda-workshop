import type { Context } from 'aws-lambda';
import type { CloudWatchEvent, PaymentCompletedEvent } from './models';
import { RideCompletionService } from './services/RideCompletionService';

const rideCompletionService = new RideCompletionService();

export const handler = async (
  event: CloudWatchEvent<PaymentCompletedEvent>,
  context: Context
): Promise<void> => {
  try {
    const result = await rideCompletionService.processPaymentCompletedEvent(
      event.detail,
      event['detail-type']
    );

    if (!result.success) {
      console.log(
        `ERROR: Failed to process payment event - PaymentId: ${result.paymentId}, RideId: ${result.rideId}, DriverId: ${result.driverId}, ErrorType: ${result.errorType}, Error: ${result.errorMessage}`
      );
      return;
    }

    console.log(
      `Payment event processing completed successfully - PaymentId: ${result.paymentId}, RideId: ${result.rideId}, DriverId: ${result.driverId}, RideUpdateSuccessful: ${result.rideUpdateSuccessful}, DriverUpdateSuccessful: ${result.driverUpdateSuccessful}`
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    console.log(
      `ERROR: Unexpected error processing payment event - Error: ${errorMessage}`
    );
    throw error;
  }
};