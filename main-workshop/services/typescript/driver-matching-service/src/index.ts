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

    console.log(`Found ${result.availableDriversCount} available drivers`);

    if (!result.success) {
      console.error(`[ERROR] No available drivers for ride ${result.rideId}`);
      return;
    }

    console.log(
      `Successfully assigned driver ${result.assignedDriverId} to ride ${result.rideId} and sent event to payment processor`
    );
  } catch (error) {
    console.error(
      '[ERROR] DRIVER_MATCHING_ERROR:',
      error instanceof Error ? error.message : error
    );
    throw error;
  }
};
