"""
This file is part of the Payment Processor service.
Update this file in the Module 2 Idempotency exercise.
"""

from aws_lambda_powertools import Logger

from models import PaymentResult
from operations import PaymentOperations

logger: Logger = None


class PaymentProcessor:
    def __init__(self, logger_instance: Logger):
        global logger
        logger = logger_instance
        self.payment_ops = PaymentOperations()

    def handle_payment(self, event_detail: dict) -> PaymentResult:
        """Handle payment processing"""
        result = self.payment_ops.process_payment(event_detail)

        if result.success and result.payment:

            logger.info(
                "Payment created",
                extra={
                    "ride_id": result.payment.ride_id,
                    "payment_id": result.payment.payment_id,
                    "payment_amount": str(result.payment.amount),
                    "payment_method": result.payment.payment_method,
                },
            )

        return result
