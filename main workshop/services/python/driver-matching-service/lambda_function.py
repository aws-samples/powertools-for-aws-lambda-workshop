from typing import Any

from operations import DriverMatchingOperations

driver_ops = DriverMatchingOperations()


def lambda_handler(event: dict[str, Any], context: Any) -> None:
    """Lambda handler for EventBridge PriceCalculated events"""
    try:
        # Process the ride request
        result = driver_ops.process_ride_request(event.get("detail", {}))

        print(f"Found {result.available_drivers_count} available drivers")

        if not result.success:
            print(f"[ERROR] No available drivers for ride {result.ride_id}")
            return

        print(
            f"Successfully assigned driver {result.assigned_driver_id} to ride "
            f"{result.ride_id} and sent event to payment processor"
        )

    except Exception as ex:
        print(f"[ERROR] DRIVER_MATCHING_ERROR: {ex}")
        raise
