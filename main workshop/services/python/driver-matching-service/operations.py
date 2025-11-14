import json
import os
from datetime import datetime, timezone
from typing import List, Optional

import boto3

from models import (
    Driver,
    DriverAssignedEvent,
    DriverMatchingResult,
    Location,
    RideRequest,
)


class DriverMatchingOperations:
    def __init__(self):
        self.dynamodb = boto3.resource("dynamodb")
        self.eventbridge = boto3.client("events")
        self.drivers_table_name = os.environ.get("DRIVERS_TABLE_NAME", "Drivers")
        self.rides_table_name = os.environ.get(
            "RIDES_TABLE_NAME", "powertools-ride-workshop-Rides"
        )
        self.event_bus_name = os.environ.get("EVENT_BUS_NAME", "")
        self.drivers_table = self.dynamodb.Table(self.drivers_table_name)
        self.rides_table = self.dynamodb.Table(self.rides_table_name)

    def process_ride_request(self, event_detail: dict) -> DriverMatchingResult:
        """Process ride request from EventBridge PriceCalculated event"""
        try:
            # Parse the ride request from event detail
            request = self._deserialize_ride_request(event_detail)
            if not request:
                raise Exception("Failed to deserialize ride request")

            return self._process_ride_request_internal(request)

        except Exception as ex:
            raise

    def _process_ride_request_internal(
        self, request: RideRequest
    ) -> DriverMatchingResult:
        """Internal method to process ride request and assign driver"""
        result = DriverMatchingResult(
            ride_id=request.ride_id,
            estimated_price=request.estimated_price,
            available_drivers_count=0,
            success=False,
        )

        try:
            # Get available drivers
            available_drivers = self._get_available_drivers()
            result.available_drivers_count = len(available_drivers)

            if not available_drivers:
                self._update_ride_with_driver(
                    request.ride_id, "", "no-driver-available"
                )
                result.error_message = "No available drivers"
                return result

            # Select the first available driver
            # (in real implementation, this would use proximity/rating logic)
            selected_driver = available_drivers[0]
            result.assigned_driver_id = selected_driver.driver_id

            # Update driver status to busy
            # Commented out for demo purposes - we don't need to track real status in the DB
            # self._update_driver_status(selected_driver.driver_id, "busy")

            # Update ride with driver information and status
            self._update_ride_with_driver(
                request.ride_id, selected_driver.driver_id, "driver-assigned"
            )

            # Send DriverAssignedEvent to payment processor
            driver_assigned_event = self._create_driver_assigned_event(
                request, selected_driver
            )
            self._send_driver_assigned_event(driver_assigned_event)

            result.success = True
            return result

        except Exception as ex:
            result.error_message = str(ex)
            raise  # Re-throw to mark message as failed for retry

    def _get_available_drivers(self) -> List[Driver]:
        """Get all available drivers from DynamoDB"""
        try:
            # For demo purposes: fetch all drivers without status filter
            response = self.drivers_table.scan(
                # FilterExpression="attribute_exists(#status) AND #status = :status",
                # ExpressionAttributeNames={"#status": "status"},
                # ExpressionAttributeValues={":status": "available"},
            )

            drivers = []
            for item in response.get("Items", []):
                try:
                    driver = self._deserialize_driver(item)
                    drivers.append(driver)
                except Exception:
                    # Skip invalid driver records
                    continue

            return drivers

        except Exception as ex:
            return []

    def _update_driver_status(self, driver_id: str, status: str) -> None:
        """Update driver status in DynamoDB"""
        self.drivers_table.update_item(
            Key={"driverId": driver_id},
            UpdateExpression="SET #status = :status, updatedAt = :updated_at",
            ExpressionAttributeNames={"#status": "status"},
            ExpressionAttributeValues={
                ":status": status,
                ":updated_at": datetime.now(timezone.utc).isoformat(),
            },
        )

    def _update_ride_with_driver(
        self, ride_id: str, driver_id: str, status: str
    ) -> None:
        """Update ride with driver information and status"""
        if not ride_id:
            raise ValueError("ride_id cannot be empty")
        
        self.rides_table.update_item(
            Key={"rideId": ride_id},
            UpdateExpression="SET driverId = :driver_id, #status = :status, "
            "updatedAt = :updated_at",
            ExpressionAttributeNames={"#status": "status"},
            ExpressionAttributeValues={
                ":driver_id": driver_id,
                ":status": status,
                ":updated_at": datetime.now(timezone.utc).isoformat(),
            },
        )

    def _send_driver_assigned_event(self, event: DriverAssignedEvent) -> None:
        """Send DriverAssigned event to EventBridge"""
        if not self.event_bus_name:
            return

        event_detail = {
            "eventType": event.event_type,
            "rideId": event.ride_id,
            "riderId": event.rider_id,
            "riderName": event.rider_name,
            "driverId": event.driver_id,
            "driverName": event.driver_name,
            "estimatedPrice": str(event.estimated_price),
            "basePrice": str(event.base_price),
            "surgeMultiplier": str(event.surge_multiplier),
            "pickupLocation": event.pickup_location.dict(),
            "dropoffLocation": event.dropoff_location.dict(),
            "estimatedArrivalMinutes": event.estimated_arrival_minutes,
            "distanceKm": event.distance_km,
            "paymentMethod": event.payment_method,
            "timestamp": event.timestamp.isoformat(),
        }
        
        # Add correlationId if present
        if event.correlation_id:
            event_detail["correlationId"] = event.correlation_id

        self.eventbridge.put_events(
            Entries=[
                {
                    "Source": "driver-matching-service",
                    "DetailType": "DriverAssigned",
                    "Detail": json.dumps(event_detail),
                    "EventBusName": self.event_bus_name,
                }
            ]
        )

    def _create_driver_assigned_event(
        self, request: RideRequest, driver: Driver
    ) -> DriverAssignedEvent:
        """Create DriverAssignedEvent from ride request and selected driver"""
        return DriverAssignedEvent(
            ride_id=request.ride_id,
            rider_id=request.rider_id,
            rider_name=request.rider_name,
            driver_id=driver.driver_id,
            driver_name=driver.driver_name,
            estimated_price=request.estimated_price,
            base_price=request.base_price,
            surge_multiplier=request.surge_multiplier,
            pickup_location=request.pickup_location,
            dropoff_location=request.dropoff_location,
            payment_method=request.payment_method,
            timestamp=datetime.now(timezone.utc),
            correlation_id=request.correlation_id,
        )

    def _deserialize_ride_request(self, event_detail: dict) -> Optional[RideRequest]:
        """Deserialize ride request from EventBridge event detail"""
        try:
            # Check if rideId exists and is not empty
            ride_id = event_detail.get("rideId", "")
            if not ride_id:
                print("ERROR: rideId is missing or empty in event detail")
                return None
            
            # Parse timestamp with multiple format support
            timestamp_str = event_detail["timestamp"]
            timestamp = self._parse_timestamp(timestamp_str)

            return RideRequest(
                ride_id=ride_id,
                rider_id=event_detail["riderId"],
                rider_name=event_detail["riderName"],
                pickup_location=Location(**event_detail["pickupLocation"]),
                dropoff_location=Location(**event_detail["dropoffLocation"]),
                estimated_price=float(event_detail["estimatedPrice"]),
                base_price=float(event_detail["basePrice"]),
                surge_multiplier=float(event_detail["surgeMultiplier"]),
                distance=float(event_detail.get("distance", 0.0)),
                payment_method=event_detail.get("paymentMethod", "credit-card"),
                timestamp=timestamp,
                correlation_id=event_detail.get("correlationId"),
            )
        except Exception as ex:
            return None

    def _deserialize_driver(self, item: dict) -> Driver:
        """Deserialize driver from DynamoDB item"""
        # Parse current location
        current_location = self._parse_location(item)

        return Driver(
            driver_id=item["driverId"],
            driver_name=self._get_driver_name(item),
            current_location=current_location,
            status=item["status"],
            rating=float(item.get("rating", 5.0)),
            created_at=self._parse_timestamp(
                item.get("createdAt", datetime.now(timezone.utc).isoformat())
            ),
            updated_at=self._parse_timestamp(self._get_updated_at(item)),
        )

    def _parse_location(self, item: dict) -> Location:
        """Parse location from DynamoDB item"""
        location_data = None

        # Try different location field names
        if "currentLocation" in item:
            location_data = item["currentLocation"]
        elif "location" in item:
            location_data = item["location"]

        if location_data and isinstance(location_data, str):
            try:
                location_dict = json.loads(location_data)
                return Location(**location_dict)
            except json.JSONDecodeError:
                pass
        elif location_data and isinstance(location_data, dict):
            return Location(**location_data)

        # Return default location if parsing fails
        return Location(address="Unknown", latitude=0.0, longitude=0.0)

    def _get_driver_name(self, item: dict) -> str:
        """Get driver name from DynamoDB item"""
        if "driverName" in item:
            return item["driverName"]
        elif "name" in item:
            return item["name"]
        return "Unknown Driver"

    def _get_updated_at(self, item: dict) -> str:
        """Get updated timestamp from DynamoDB item"""
        if "updatedAt" in item:
            return item["updatedAt"]
        elif "lastUpdated" in item:
            return item["lastUpdated"]
        return datetime.now(timezone.utc).isoformat()

    def _parse_timestamp(self, timestamp_str: str) -> datetime:
        """Parse timestamp string with multiple format support"""
        try:
            # Try standard ISO format with Z
            if timestamp_str.endswith("Z"):
                return datetime.fromisoformat(timestamp_str.replace("Z", "+00:00"))

            # Try ISO format with timezone
            if "+" in timestamp_str or timestamp_str.endswith("+00:00"):
                return datetime.fromisoformat(timestamp_str)

            # Try without timezone (assume UTC)
            dt = datetime.fromisoformat(timestamp_str)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt

        except ValueError as ex:
            # Return current time as fallback
            return datetime.now(timezone.utc)
