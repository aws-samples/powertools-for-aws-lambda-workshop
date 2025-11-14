from datetime import datetime, timezone
from decimal import Decimal
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict, Field, model_serializer


class Location(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    
    address: str
    latitude: float
    longitude: float


class Driver(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    
    driver_id: str = Field(alias="driverId")
    driver_name: str = Field(alias="driverName")
    current_location: Location = Field(alias="currentLocation")
    status: str = "available"
    rating: float = 5.0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), alias="createdAt")
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), alias="updatedAt")
    
    @model_serializer
    def serialize_model(self) -> dict[str, Any]:
        return {
            'driver_id': self.driver_id,
            'driver_name': self.driver_name,
            'current_location': self.current_location.model_dump(),
            'status': self.status,
            'rating': self.rating,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
        }


class RideRequest(BaseModel):
    """Input event from dynamic-pricing-service"""
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


class DriverAssignedEvent(BaseModel):
    """Event sent to payment processor after driver assignment"""
    model_config = ConfigDict(populate_by_name=True)

    event_type: str = Field(default="DriverAssigned", alias="eventType")
    ride_id: str = Field(alias="rideId")
    rider_id: str = Field(alias="riderId")
    rider_name: str = Field(alias="riderName")
    driver_id: str = Field(alias="driverId")
    driver_name: str = Field(alias="driverName")
    estimated_price: Decimal = Field(alias="estimatedPrice")
    base_price: Decimal = Field(alias="basePrice")
    surge_multiplier: Decimal = Field(alias="surgeMultiplier")
    pickup_location: Location = Field(alias="pickupLocation")
    dropoff_location: Location = Field(alias="dropoffLocation")
    estimated_arrival_minutes: int = Field(default=0, alias="estimatedArrivalMinutes")
    distance_km: float = Field(default=0.0, alias="distanceKm")
    payment_method: str = Field(default="credit-card", alias="paymentMethod")
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    correlation_id: Optional[str] = Field(default=None, alias="correlationId")
    
    @model_serializer
    def serialize_model(self) -> dict[str, Any]:
        return {
            'event_type': self.event_type,
            'ride_id': self.ride_id,
            'rider_id': self.rider_id,
            'rider_name': self.rider_name,
            'driver_id': self.driver_id,
            'driver_name': self.driver_name,
            'estimated_price': str(self.estimated_price),
            'base_price': str(self.base_price),
            'surge_multiplier': str(self.surge_multiplier),
            'pickup_location': self.pickup_location.model_dump(),
            'dropoff_location': self.dropoff_location.model_dump(),
            'estimated_arrival_minutes': self.estimated_arrival_minutes,
            'distance_km': self.distance_km,
            'payment_method': self.payment_method,
            'timestamp': self.timestamp.isoformat(),
            'correlation_id': self.correlation_id,
        }


class DriverMatchingResult(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    
    ride_id: str = Field(alias="rideId")
    estimated_price: Decimal = Field(alias="estimatedPrice")
    available_drivers_count: int = Field(alias="availableDriversCount")
    assigned_driver_id: str = Field(default="", alias="assignedDriverId")
    success: bool
    error_message: str = Field(default="", alias="errorMessage")
