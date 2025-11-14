from typing import Any

from operations import RideCompletionOperations

ride_completion_ops = RideCompletionOperations()


def lambda_handler(event: dict[str, Any], context: Any) -> None:
    """Lambda handler for EventBridge PaymentCompleted events"""
    try:
        # Process the payment completed event
        result = ride_completion_ops.process_payment_completed_event(
            event.get("detail", {}), event.get("detail-type", "")
        )

        if not result.success:
            print(
                f"ERROR: Failed to process payment event - "
                f"PaymentId: {result.payment_id}, RideId: {result.ride_id}, "
                f"DriverId: {result.driver_id}, ErrorType: {result.error_type}, "
                f"Error: {result.error_message}"
            )
            return

        print(
            f"Payment event processing completed successfully - "
            f"PaymentId: {result.payment_id}, RideId: {result.ride_id}, "
            f"DriverId: {result.driver_id}, "
            f"RideUpdateSuccessful: {result.ride_update_successful}, "
            f"DriverUpdateSuccessful: {result.driver_update_successful}"
        )

    except Exception as ex:
        print(f"ERROR: Unexpected error processing payment event - Error: {str(ex)}")
        raise
