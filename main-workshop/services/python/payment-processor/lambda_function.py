from typing import Any

from payment_processor import PaymentProcessor

payment_processor = PaymentProcessor()


def lambda_handler(event: dict[str, Any], context: Any) -> None:
    """
    Lambda handler for EventBridge DriverAssigned events.
    Processes payments through various payment gateways and writes payment records
    to DynamoDB.
    """
    try:
        # Process the payment
        result = payment_processor.handle_payment(event_detail=event.get("detail", {}))

        if result.success:
            print(
                f"Payment completed successfully: "
                f"{result.payment.payment_id if result.payment else 'N/A'} for "
                f"${result.payment.amount if result.payment else 'N/A'}"
            )
        else:
            print(f"Payment failed: {result.error_message}")

    except Exception as ex:
        print(f"Error in lambda_handler: {ex}")
        raise