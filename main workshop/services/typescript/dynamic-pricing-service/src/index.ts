import type { EventBridgeEvent } from 'aws-lambda';
import type { RideCreatedEvent } from './models';
import { PricingService } from './services/PricingService';
import { RushHourMultiplierService } from './services/RushHourMultiplierService';

const pricingService = new PricingService();
const rushHourMultiplierService = new RushHourMultiplierService();

export const handler = async (
  event: EventBridgeEvent<'RideCreated', RideCreatedEvent>
): Promise<void> => {
  try {
    // Retrieve rush hour multiplier from Secrets Manager
    const rushHourMultiplier =
      await rushHourMultiplierService.getRushHourMultiplier();

    console.log(`Retrieved rush hour multiplier: ${rushHourMultiplier}`);

    const result = await pricingService.processRideCreatedEvent(
      event.detail,
      rushHourMultiplier
    );

    if (!result.success) {
      console.error(`[ERROR] PRICING_FAILURE: ${result.errorMessage}`);
      return;
    }

    console.log(`Successfully processed pricing for ride ${result.rideId}`);
  } catch (error) {
    console.error(
      '[ERROR] PRICING_ERROR:',
      error instanceof Error ? error.message : error
    );
    throw error;
  }
};