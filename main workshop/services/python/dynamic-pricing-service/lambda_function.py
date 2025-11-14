from typing import Any

from operations import DynamicPricingOperations
from rush_hour_service import RushHourMultiplierService

pricing_ops = DynamicPricingOperations()
rush_hour_service = RushHourMultiplierService()


def lambda_handler(event: dict[str, Any], context: Any) -> None:
    """Lambda handler for EventBridge RideCreated events"""
    try:
        # Retrieve rush hour multiplier from Secrets Manager
        rush_hour_multiplier = rush_hour_service.get_rush_hour_multiplier()

        print(f"Retrieved rush hour multiplier: {rush_hour_multiplier}")

        # Process the RideCreated event
        result = pricing_ops.process_ride_created_event(
            event.get("detail", {}), rush_hour_multiplier
        )

        if not result.success:
            print(f"[ERROR] PRICING_FAILURE: {result.error_message}")
            return

        print(f"Successfully processed pricing for ride {result.ride_id}")

    except Exception as ex:
        print(f"[ERROR] PRICING_ERROR: {ex}")
        raise
