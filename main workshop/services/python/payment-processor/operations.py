import json
import os
import random
import time
import uuid
from datetime import datetime, timezone
from typing import Optional, Union

import boto3
from aws_lambda_powertools.utilities.parser import parse

from models import (
    DriverAssignedEvent,
    Payment,
    PaymentCompletedEvent,
    PaymentGatewayResult,
    PaymentResult,
)


class PaymentOperations:
    def __init__(self):
        self.dynamodb = boto3.resource("dynamodb")
        self.eventbridge = boto3.client("events")
        self.payments_table_name = os.environ.get("PAYMENTS_TABLE_NAME", "Payments")
        self.event_bus_name = os.environ.get("EVENT_BUS_NAME", "")
        self.payments_table = self.dynamodb.Table(self.payments_table_name)
        self.random = random.Random()
        self.correlation_id = None

    def process_payment(self, event_detail: Union[dict, DriverAssignedEvent]) -> PaymentResult:
        """Process payment - handles dict or DriverAssignedEvent"""
        
        # Parse dict to DriverAssignedEvent if needed
        if isinstance(event_detail, dict):
            driver_event = parse(event=event_detail, model=DriverAssignedEvent)
        else:
            driver_event = event_detail
        
        if driver_event is None:
            raise Exception("Failed to deserialize driver assigned event")
        
        # Extract and store correlation ID
        self.correlation_id = driver_event.correlation_id
        
        return self._process_payment_internal(driver_event)

    def _process_payment_internal(
        self, driver_event: DriverAssignedEvent
    ) -> PaymentResult:
        """Internal method to process payment"""
        payment_id = str(uuid.uuid4())

        # Create simple payment record
        payment = Payment(
            payment_id=payment_id,
            ride_id=driver_event.ride_id,
            rider_id=driver_event.rider_id,
            driver_id=driver_event.driver_id,
            amount=driver_event.estimated_price,
            payment_method=driver_event.payment_method,
            status="processing"
        )

        self._create_payment(payment)

        # Simple payment processing
        gateway_result = self._process_payment_gateway(payment)

        # Update payment status based on gateway result
        if gateway_result.success:
            self._update_payment_status(
                payment_id, 
                "completed", 
                transaction_id=gateway_result.transaction_id
            )

            # Only send PaymentCompleted event if payment succeeded
            self._send_payment_event(PaymentCompletedEvent(
                payment_id=payment_id,
                ride_id=driver_event.ride_id,
                rider_id=driver_event.rider_id,
                driver_id=driver_event.driver_id,
                amount=payment.amount,
                payment_method=payment.payment_method,
                transaction_id=gateway_result.transaction_id or "",
                correlation_id=self.correlation_id
            ))
        else:
            # Update status to failed if payment gateway failed
            self._update_payment_status(
                payment_id,
                "failed",
                failure_reason=gateway_result.error_message
            )

        return PaymentResult(
            success=gateway_result.success,
            payment=payment,
            transaction_id=gateway_result.transaction_id,
            error_message=gateway_result.error_message,
            processing_time_ms=gateway_result.processing_time_ms
        )

    def _create_payment(self, payment: Payment) -> None:
        """Create payment record in DynamoDB"""
        item = {
            "paymentId": payment.payment_id,
            "rideId": payment.ride_id,
            "riderId": payment.rider_id,
            "driverId": payment.driver_id,
            "amount": str(payment.amount),
            "paymentMethod": payment.payment_method,
            "status": payment.status,
            "createdAt": payment.created_at.isoformat(),
            "updatedAt": payment.updated_at.isoformat(),
        }

        if payment.failure_reason:
            item["failureReason"] = payment.failure_reason

        if payment.transaction_id:
            item["transactionId"] = payment.transaction_id
            
        if self.correlation_id:
            item["correlationId"] = self.correlation_id

        self.payments_table.put_item(Item=item)

    def _update_payment_status(
        self,
        payment_id: str,
        status: str,
        transaction_id: Optional[str] = None,
        failure_reason: Optional[str] = None,
    ) -> None:
        """Update payment status in DynamoDB"""
        update_expression = "SET #status = :status, updatedAt = :updated_at"
        expression_attribute_names = {"#status": "status"}
        expression_attribute_values = {
            ":status": status,
            ":updated_at": datetime.now(timezone.utc).isoformat(),
        }

        if transaction_id:
            update_expression += ", transactionId = :transaction_id"
            expression_attribute_values[":transaction_id"] = transaction_id

        if failure_reason:
            update_expression += ", failureReason = :failure_reason"
            expression_attribute_values[":failure_reason"] = failure_reason

        self.payments_table.update_item(
            Key={"paymentId": payment_id},
            UpdateExpression=update_expression,
            ExpressionAttributeNames=expression_attribute_names,
            ExpressionAttributeValues=expression_attribute_values,
        )

    def _process_payment_gateway(self, payment: Payment) -> PaymentGatewayResult:
        """Process payment through gateway"""
        start_time = time.time()

        payment_method = payment.payment_method.lower()

        if payment_method == "somecompany-pay":
            # Simulate additional processing time for SomeCompany Pay (5 seconds)
            time.sleep(5)
        else:
            time.sleep(0.1 + self.random.random() * 0.2)

        processing_time_ms = int((time.time() - start_time) * 1000)

        # Simulate 5% failure rate
        success = self.random.randint(0, 99) >= 5
        transaction_id = f"txn_{str(uuid.uuid4())[:8]}" if success else None
        error_message = None if success else "Payment gateway declined transaction"

        return PaymentGatewayResult(
            success=success,
            transaction_id=transaction_id,
            error_message=error_message,
            processing_time_ms=processing_time_ms,
        )

    def _send_payment_event(self, payment_event) -> None:
        """Send payment event to EventBridge"""
        if not self.event_bus_name:
            return

        # Convert event to dict for JSON serialization
        if hasattr(payment_event, "dict"):
            event_dict = payment_event.dict()
        else:
            event_dict = payment_event.__dict__

        # Convert Decimal to string for JSON serialization
        if "amount" in event_dict and event_dict["amount"]:
            event_dict["amount"] = str(event_dict["amount"])

        # Convert datetime to ISO string
        if "timestamp" in event_dict and event_dict["timestamp"]:
            if isinstance(event_dict["timestamp"], datetime):
                event_dict["timestamp"] = event_dict["timestamp"].isoformat()

        event_detail = json.dumps(event_dict)

        response = self.eventbridge.put_events(
            Entries=[
                {
                    "Source": "payment-processor",
                    "DetailType": payment_event.event_type,
                    "Detail": event_detail,
                    "EventBusName": self.event_bus_name,
                }
            ]
        )

        if response.get("FailedEntryCount", 0) > 0:
            failed_entry = response["Entries"][0]
            raise Exception(f"Failed to send event: {failed_entry.get('ErrorCode')}")

