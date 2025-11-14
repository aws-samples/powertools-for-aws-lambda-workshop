from datetime import datetime, timezone
from decimal import Decimal
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict, Field, model_serializer


class Location(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    
    address: str
    latitude: float
    longitude: float


class RideCreatedEvent(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    
    ride_id: str = Field(alias="rideId")
    rider_id: str = Field(alias="riderId")
    rider_name: str = Field(alias="riderName")
    pickup_location: Location = Field(alias="pickupLocation")
    destination_location: Location = Field(alias="destinationLocation")
    payment_method: str = Field(default="credit-card", alias="paymentMethod")
    timestamp: datetime
    event_type: str = Field(default="RideCreated", alias="eventType")
    correlation_id: Optional[str] = Field(default=None, alias="correlationId")
    
    @model_serializer
    def serialize_model(self) -> dict[str, Any]:
        return {
            'ride_id': self.ride_id,
            'rider_id': self.rider_id,
            'rider_name': self.rider_name,
            'pickup_location': self.pickup_location.model_dump(),
            'destination_location': self.destination_location.model_dump(),
            'payment_method': self.payment_method,
            'timestamp': self.timestamp.isoformat(),
            'event_type': self.event_type,
            'correlation_id': self.correlation_id,
        }


class RideRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    
    ride_id: str = Field(alias="rideId")
    rider_id: str = Field(alias="riderId")
    rider_name: str = Field(alias="riderName")
    pickup_location: Location = Field(alias="pickupLocation")
    dropoff_location: Location = Field(alias="dropoffLocation")
    estimated_price: Decimal = Field(alias="estimatedPrice")
    base_price: Decimal = Field(alias="basePrice")
    surge_multiplier: Decimal = Field(alias="surgeMultiplier")
    distance: float
    payment_method: str = Field(default="credit-card", alias="paymentMethod")
    timestamp: datetime
    correlation_id: Optional[str] = Field(default=None, alias="correlationId")
    
    @model_serializer
    def serialize_model(self) -> dict[str, Any]:
        return {
            'ride_id': self.ride_id,
            'rider_id': self.rider_id,
            'rider_name': self.rider_name,
            'pickup_location': self.pickup_location.model_dump(),
            'dropoff_location': self.dropoff_location.model_dump(),
            'estimated_price': str(self.estimated_price),
            'base_price': str(self.base_price),
            'surge_multiplier': str(self.surge_multiplier),
            'distance': self.distance,
            'payment_method': self.payment_method,
            'timestamp': self.timestamp.isoformat(),
            'correlation_id': self.correlation_id,
        }


class PriceCalculation(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    
    ride_id: str = Field(alias="rideId")
    base_price: Decimal = Field(alias="basePrice")
    final_price: Decimal = Field(alias="finalPrice")
    surge_multiplier: Decimal = Field(default=Decimal("1.0"), alias="surgeMultiplier")
    distance_km: float = Field(alias="distanceKm")
    created_at: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat(),
        alias="createdAt",
    )


class PricingResult(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    
    ride_id: str = Field(default="", alias="rideId")
    rider_id: str = Field(default="", alias="riderId")
    final_price: Decimal = Field(default=Decimal("0"), alias="finalPrice")
    base_price: Decimal = Field(default=Decimal("0"), alias="basePrice")
    surge_multiplier: Decimal = Field(default=Decimal("1.0"), alias="surgeMultiplier")
    success: bool = False
    error_message: str = Field(default="", alias="errorMessage")
    error_type: str = Field(default="", alias="errorType")


class SecretData(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    
    rush_hour_multiplier: Decimal = Field(alias="rushHourMultiplier")
    last_updated: datetime = Field(alias="lastUpdated")
    description: str = ""
    
    @model_serializer
    def serialize_model(self) -> dict[str, Any]:
        return {
            'rush_hour_multiplier': str(self.rush_hour_multiplier),
            'last_updated': self.last_updated.isoformat(),
            'description': self.description,
        }


class BusinessRuleException(Exception):
    def __init__(self, rule_name: str, message: str, business_context: dict = None):
        super().__init__(message)
        self.rule_name = rule_name
        self.business_context = business_context or {}
