import json
import os
import time
from datetime import datetime
from decimal import Decimal
from typing import Any, Dict, Optional

import boto3

from models import PaymentStreamModel


class BatchException(Exception):
    """Exception for batch processing failures"""

    def __init__(self, message: str, payment_model: PaymentStreamModel):
        super().__init__(message)
        self.payment_model = payment_model


class PaymentStreamOperations:
    def __init__(self):
        self.eventbridge = boto3.client("events")
        self.event_bus_name = os.environ.get("EVENT_BUS_NAME", "")

    def extract_record(self, record: Dict[str, Any]) -> PaymentStreamModel:
        """
        Extract record metadata without processing (safe operation that shouldn't fail)
        """
        # Simulate expensive API call with 500ms latency
        time.sleep(0.5)

        # Extract payment data from the stream record
        dynamodb_record = record.get("dynamodb", {})
        new_image = dynamodb_record.get("NewImage", {})

        # Extract business context for logging
        payment_id = self._get_attribute_value(new_image, "paymentId")
        ride_id = self._get_attribute_value(new_image, "rideId")
        rider_id = self._get_attribute_value(new_image, "riderId")
        driver_id = self._get_attribute_value(new_image, "driverId")
        correlation_id = self._get_attribute_value(new_image, "correlationId")
        amount = self._get_attribute_value(new_image, "amount")
        payment_method = self._get_attribute_value(new_image, "paymentMethod")
        transaction_id = self._get_attribute_value(new_image, "transactionId")
        status = self._get_attribute_value(new_image, "status")

        return PaymentStreamModel(
            success=True,
            payment_id=payment_id,
            ride_id=ride_id,
            rider_id=rider_id,
            driver_id=driver_id,
            correlation_id=correlation_id,
            amount=amount,
            payment_method=payment_method,
            transaction_id=transaction_id,
            status=status,
        )

    def process_single_record(
        self, extracted_data: PaymentStreamModel
    ) -> PaymentStreamModel:
        """
        Process a single record (can fail with various scenarios)
        """
        # FAILURE SCENARIO: Simulate poison records (records that always fail)
        # Check for a special "poison" payment ID that always causes failures
        if extracted_data.payment_id and "POISON" in extracted_data.payment_id:
            raise BatchException(
                f"Poison record detected: {extracted_data.payment_id}", extracted_data
            )

        self._process_payment_completion(extracted_data)
        return extracted_data

    def _process_payment_completion(self, extracted_data: PaymentStreamModel) -> None:
        """Process payment completion event"""
        # Skip test/synthetic data first (before any processing)
        if not self.event_bus_name or extracted_data.rider_id == "rider-batch-test":
            return
        
        # Only process payments with 'completed' status
        if extracted_data.status != "completed":
            # Skip failed or processing payments - don't send completion events
            return

        # Parse amount to decimal for proper JSON serialization
        if not extracted_data.amount or not Decimal(extracted_data.amount):
            raise ValueError(f"Invalid amount format: {extracted_data.amount}")

        amount_decimal = Decimal(extracted_data.amount)

        completion_event = {
            "eventType": "PaymentCompleted",
            "paymentId": extracted_data.payment_id,
            "rideId": extracted_data.ride_id,
            "riderId": extracted_data.rider_id,
            "driverId": extracted_data.driver_id,
            "amount": amount_decimal,
            "paymentMethod": extracted_data.payment_method,
            "transactionId": extracted_data.transaction_id,
            "timestamp": datetime.utcnow().isoformat(),
            "correlationId": extracted_data.correlation_id,
        }

        # Skip sending events for test riders or if event bus is not configured
        if not self.event_bus_name or extracted_data.rider_id == "rider-batch-test":
            return

        self._send_event_to_eventbridge("PaymentCompleted", completion_event)

    def _send_event_to_eventbridge(
        self, detail_type: str, event_detail: Dict[str, Any]
    ) -> None:
        """Send event to EventBridge"""
        # Convert Decimal to string for JSON serialization
        if "amount" in event_detail and event_detail["amount"]:
            event_detail["amount"] = str(event_detail["amount"])

        event_detail_json = json.dumps(event_detail)

        put_events_request = {
            "Entries": [
                {
                    "Source": "payment-stream-processor",
                    "DetailType": detail_type,
                    "Detail": event_detail_json,
                    "EventBusName": self.event_bus_name,
                }
            ]
        }

        result = self.eventbridge.put_events(**put_events_request)

        failed_entries = [
            entry for entry in result.get("Entries", []) if entry.get("ErrorCode")
        ]
        if failed_entries:
            raise Exception(
                f"Failed to send event: {failed_entries[0].get('ErrorCode')}"
            )

    def _get_attribute_value(
        self, attributes: Dict[str, Any], key: str
    ) -> Optional[str]:
        """Extract attribute value from DynamoDB stream record"""
        if not attributes or key not in attributes:
            return None

        attribute = attributes[key]
        # DynamoDB stream records have format like {"S": "value"} or {"N": "123"}
        return attribute.get("S") or attribute.get("N")
