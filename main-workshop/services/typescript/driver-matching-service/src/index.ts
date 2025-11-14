import type { EventBridgeEvent } from 'aws-lambda';
import type { PriceCalculatedEvent } from './models';
import { DriverMatchingService } from './services/DriverMatchingService';

const driverMatchingService = new DriverMatchingService();

export const handler = async (
  event: EventBridgeEvent<'PriceCalculated', PriceCalculatedEvent>
): Promise<void> => {
  try {
    const result = await driverMatchingService.processPriceCalculatedEvent(
      event.detail
    );

    if (!result.success) {
      console.error(`[ERROR] Driver matching failed: ${result.errorMessage}`);
      return;
    }

    console.log(
      `Successfully processed driver matching for ride ${result.rideId}`
    );
  } catch (error) {
    console.error(
      '[ERROR] DRIVER_MATCHING_ERROR:',
      error instanceof Error ? error.message : error
    );
    throw error;
  }
};