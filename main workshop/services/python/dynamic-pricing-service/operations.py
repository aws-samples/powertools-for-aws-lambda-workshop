import json
import math
import os
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any, Dict

import boto3

from models import (
    BusinessRuleException,
    Location,
    PriceCalculation,
    PricingResult,
    RideCreatedEvent,
    RideRequest,
)


class DynamicPricingOperations:
    # Pricing constants
    MIN_BASE_PRICE = Decimal("5.0")
    MAX_BASE_PRICE = Decimal("20.0")

    def __init__(self):
        self.dynamodb = boto3.resource("dynamodb")
        self.eventbridge = boto3.client("events")

        self.pricing_table_name = os.environ.get("PRICING_TABLE_NAME", "Pricing")
        self.event_bus_name = os.environ.get("EVENT_BUS_NAME", "")

        self.pricing_table = self.dynamodb.Table(self.pricing_table_name)

    def process_ride_created_event(
        self, event_detail: Dict[str, Any], rush_hour_multiplier: Decimal
    ) -> PricingResult:
        """Process a RideCreated event and calculate pricing."""
        result = PricingResult()

        try:
            # Parse the event
            ride_event = RideCreatedEvent(**event_detail)
            result.ride_id = ride_event.ride_id
            result.rider_id = ride_event.rider_id

            if not ride_event.pickup_location or not ride_event.destination_location:
                result.success = False
                result.error_type = "ValidationError"
                result.error_message = "Missing pickup or destination location"
                return result

            # Process the ride for pricing
            return self._process_ride_for_pricing(ride_event, rush_hour_multiplier)

        except Exception as ex:
            result.success = False
            result.error_type = "UnexpectedError"
            result.error_message = str(ex)
            raise

    def _process_ride_for_pricing(
        self, ride_event: RideCreatedEvent, rush_hour_multiplier: Decimal
    ) -> PricingResult:
        """Calculate pricing for a ride and send events."""
        result = PricingResult(ride_id=ride_event.ride_id, rider_id=ride_event.rider_id)

        try:
            # Calculate price using simplified pricing rules
            price_calculation = self._calculate_price(ride_event, rush_hour_multiplier)

            # Save price calculation to database
            self._save_price_calculation(price_calculation)

            # Send ride request to driver matching service
            ride_request = self._create_ride_request(ride_event, price_calculation)
            self._send_price_calculated_event(ride_request)

            result.success = True
            result.final_price = price_calculation.final_price
            result.base_price = price_calculation.base_price
            result.surge_multiplier = price_calculation.surge_multiplier

            return result

        except BusinessRuleException as ex:
            result.success = False
            result.error_type = "BusinessRuleViolation"
            result.error_message = str(ex)
            raise
        except Exception as ex:
            result.success = False
            result.error_type = "UnexpectedError"
            result.error_message = str(ex)
            raise

    def _calculate_price(
        self, ride_event: RideCreatedEvent, rush_hour_multiplier: Decimal
    ) -> PriceCalculation:
        """Calculate the price for a ride using random base price and surge multiplier."""
        import random
        
        # Generate random base price between MIN and MAX
        base_price_float = random.uniform(float(self.MIN_BASE_PRICE), float(self.MAX_BASE_PRICE))
        base_price = Decimal(str(round(base_price_float, 2)))
        
        final_price = (base_price * rush_hour_multiplier).quantize(Decimal("0.01"))

        return PriceCalculation(
            rideId=ride_event.ride_id,
            basePrice=base_price,
            distanceKm=0.0,  # Not used in random pricing
            surgeMultiplier=rush_hour_multiplier,
            finalPrice=final_price,
            createdAt=datetime.now(timezone.utc).isoformat(),
        )

    def _save_price_calculation(self, calculation: PriceCalculation) -> None:
        """Save price calculation to DynamoDB."""
        try:
            item = {
                "rideId": calculation.ride_id,
                "basePrice": str(calculation.base_price),
                "finalPrice": str(calculation.final_price),
                "surgeMultiplier": str(calculation.surge_multiplier),
                "distanceKm": Decimal(str(calculation.distance_km)),
                "createdAt": calculation.created_at,
            }

            self.pricing_table.put_item(Item=item)
        except Exception as ex:
            raise Exception(
                f"Failed to save price calculation for ride "
                f"{calculation.ride_id}: {str(ex)}"
            )

    def _send_price_calculated_event(self, ride_request: RideRequest) -> str:
        """Send PriceCalculated event to EventBridge."""
        if not self.event_bus_name:
            return "Event bus name is empty - skipping event"

        try:
            # Convert to dict for JSON serialization
            event_detail = {
                "rideId": ride_request.ride_id,
                "riderId": ride_request.rider_id,
                "riderName": ride_request.rider_name,
                "pickupLocation": ride_request.pickup_location.dict(),
                "dropoffLocation": ride_request.dropoff_location.dict(),
                "estimatedPrice": float(ride_request.estimated_price),
                "basePrice": float(ride_request.base_price),
                "surgeMultiplier": float(ride_request.surge_multiplier),
                "distance": ride_request.distance,
                "paymentMethod": ride_request.payment_method,
                "timestamp": ride_request.timestamp.isoformat(),
            }
            
            # Add correlationId if present
            if ride_request.correlation_id:
                event_detail["correlationId"] = ride_request.correlation_id

            response = self.eventbridge.put_events(
                Entries=[
                    {
                        "Source": "dynamic-pricing-service",
                        "DetailType": "PriceCalculated",
                        "Detail": json.dumps(event_detail),
                        "EventBusName": self.event_bus_name,
                    }
                ]
            )

            # Check for failed entries
            failed_entries = [
                entry for entry in response["Entries"] if "ErrorCode" in entry
            ]
            if failed_entries:
                raise Exception(
                    f"Failed to send event: {failed_entries[0]['ErrorCode']}"
                )

            return (
                f"Successfully sent PriceCalculated event. "
                f"EventId: {response['Entries'][0]['EventId']}"
            )

        except Exception as ex:
            raise Exception(f"Failed to send PriceCalculated event: {str(ex)}")



    @staticmethod
    def _create_ride_request(
        ride_event: RideCreatedEvent, price_calculation: PriceCalculation
    ) -> RideRequest:
        """Create a RideRequest from the event and price calculation."""
        return RideRequest(
            ride_id=ride_event.ride_id,
            rider_id=ride_event.rider_id,
            rider_name=ride_event.rider_name,
            pickup_location=ride_event.pickup_location,
            dropoff_location=ride_event.destination_location,
            estimated_price=price_calculation.final_price,
            base_price=price_calculation.base_price,
            surge_multiplier=price_calculation.surge_multiplier,
            distance=price_calculation.distance_km,
            payment_method=ride_event.payment_method,
            timestamp=datetime.now(timezone.utc),
            correlation_id=ride_event.correlation_id,
        )


