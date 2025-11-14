import json
import os
import uuid
from datetime import datetime, timezone
from typing import Any

import boto3

from models import Location, Ride, RideCreationResult, RideStatus


class RideOperations:
    def __init__(self):
        self.dynamodb = boto3.resource("dynamodb")
        self.eventbridge = boto3.client("events")
        self.table_name = os.environ.get("RIDES_TABLE_NAME", "Rides")
        self.event_bus_name = os.environ.get("EVENT_BUS_NAME", "")
        self.table = self.dynamodb.Table(self.table_name)

    def create_ride(
        self,
        event: dict[str, Any],
        device_id: str | None = None,
    ) -> RideCreationResult:
        """Create a new ride from API Gateway request"""
        try:
            # Extract correlation ID from request headers
            headers = event.get("headers", {})
            correlation_id = self._get_header_value(headers, "x-correlation-id")
            
            # Validate request body
            request_body = event.get("body")
            if not request_body:
                return RideCreationResult(
                    success=False,
                    error_code="InvalidRequest",
                    error_message="Request body is required",
                )

            # Parse request body
            try:
                request_data = json.loads(request_body)
            except json.JSONDecodeError:
                return RideCreationResult(
                    success=False,
                    error_code="JsonException",
                    error_message="Invalid JSON format",
                )

            # Create ride object
            ride = Ride(
                ride_id=str(uuid.uuid4()),
                rider_id=request_data["riderId"],
                rider_name=request_data["riderName"],
                pickup_location=Location(**request_data["pickupLocation"]),
                destination_location=Location(**request_data["destinationLocation"]),
                payment_method=request_data.get("paymentMethod", "credit-card"),
                device_id=device_id,
                status=RideStatus.REQUESTED,
                created_at=datetime.now(timezone.utc),
                updated_at=datetime.now(timezone.utc),
            )

            # Save to DynamoDB
            self._save_ride(ride)

            # Send event to EventBridge
            self._send_ride_created_event(ride, correlation_id)

            return RideCreationResult(success=True, ride=ride)

        except KeyError as ex:
            return RideCreationResult(
                success=False,
                error_code="InvalidRequest",
                error_message=f"Missing required field: {ex}",
            )
        except Exception as ex:
            return RideCreationResult(
                success=False, error_code="UnexpectedError", error_message=str(ex)
            )

    def _save_ride(self, ride: Ride) -> None:
        """Save ride to DynamoDB"""
        item = {
            "rideId": ride.ride_id,
            "riderId": ride.rider_id,
            "riderName": ride.rider_name,
            "pickupLocation": json.dumps(ride.pickup_location.dict()),
            "destinationLocation": json.dumps(ride.destination_location.dict()),
            "paymentMethod": ride.payment_method,
            "deviceId": ride.device_id or "unknown",
            "status": ride.status.value,
            "createdAt": ride.created_at.isoformat(),
            "updatedAt": ride.updated_at.isoformat(),
        }
        self.table.put_item(Item=item)

    def _send_ride_created_event(
        self, ride: Ride, correlation_id: str | None = None
    ) -> None:
        """Send RideCreated event to EventBridge"""
        if not self.event_bus_name:
            return

        event_detail = {
            "rideId": ride.ride_id,
            "riderId": ride.rider_id,
            "riderName": ride.rider_name,
            "pickupLocation": ride.pickup_location.dict(),
            "destinationLocation": ride.destination_location.dict(),
            "paymentMethod": ride.payment_method,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "eventType": "RideCreated",
        }

        # Add correlation ID if provided
        if correlation_id:
            event_detail["correlationId"] = correlation_id

        self.eventbridge.put_events(
            Entries=[
                {
                    "Source": "ride-service",
                    "DetailType": "RideCreated",
                    "Detail": json.dumps(event_detail),
                    "EventBusName": self.event_bus_name,
                }
            ]
        )

    def _get_header_value(self, headers: dict[str, str] | None, header_name: str) -> str | None:
        """Extract header value (case-insensitive)"""
        if not headers:
            return None

        header_key = next(
            (k for k in headers.keys() if k.lower() == header_name.lower()), None
        )

        if not header_key:
            return None

        return headers[header_key]
