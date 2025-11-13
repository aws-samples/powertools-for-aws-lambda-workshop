from datetime import datetime, timezone
from decimal import Decimal
from typing import Any, Optional

from aws_lambda_powertools.utilities.parser import BaseModel, Field
from pydantic import ConfigDict, model_serializer


class Location(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    
    address: str
    latitude: float
    longitude: float


class Payment(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    
    payment_id: str = Field(alias="paymentId")
    ride_id: str = Field(alias="rideId")
    rider_id: str = Field(alias="riderId")
    driver_id: str = Field(default="", alias="driverId")
    amount: Decimal
    payment_method: str = Field(default="credit-card", alias="paymentMethod")
    status: str = "pending"
    failure_reason: Optional[str] = Field(default=None, alias="failureReason")
    transaction_id: Optional[str] = Field(default=None, alias="transactionId")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), alias="createdAt")
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), alias="updatedAt")
    
    @model_serializer
    def serialize_model(self) -> dict[str, Any]:
        """Custom serializer to handle datetime fields"""
        return {
            'payment_id': self.payment_id,
            'ride_id': self.ride_id,
            'rider_id': self.rider_id,
            'driver_id': self.driver_id,
            'amount': str(self.amount),
            'payment_method': self.payment_method,
            'status': self.status,
            'failure_reason': self.failure_reason,
            'transaction_id': self.transaction_id,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
        }


class DriverAssignedEvent(BaseModel):
    """Input event from driver-matching-service"""
    model_config = ConfigDict(populate_by_name=True)

    event_type: str = Field(default="DriverAssigned", alias="eventType")
    ride_id: str = Field(alias="rideId")
    rider_id: str = Field(alias="riderId")
    rider_name: str = Field(alias="riderName")
    driver_id: str = Field(alias="driverId")
    driver_name: str = Field(alias="driverName")
    estimated_price: Decimal = Field(alias="estimatedPrice")
    base_price: Optional[Decimal] = Field(default=None, alias="basePrice")
    surge_multiplier: Optional[Decimal] = Field(default=None, alias="surgeMultiplier")
    pickup_location: Optional[Location] = Field(default=None, alias="pickupLocation")
    dropoff_location: Optional[Location] = Field(default=None, alias="dropoffLocation")
    estimated_arrival_minutes: Optional[int] = Field(default=None, alias="estimatedArrivalMinutes")
    distance_km: Optional[float] = Field(default=None, alias="distanceKm")
    payment_method: str = Field(default="credit-card", alias="paymentMethod")
    timestamp: datetime
    correlation_id: Optional[str] = Field(default=None, alias="correlationId")


class PaymentGatewayResult(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    
    success: bool
    transaction_id: Optional[str] = Field(default=None, alias="transactionId")
    error_message: Optional[str] = Field(default=None, alias="errorMessage")
    processing_time_ms: int = Field(alias="processingTimeMs")


class PaymentResult(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    
    success: bool
    payment: Optional[Payment] = None
    transaction_id: Optional[str] = Field(default=None, alias="transactionId")
    error_message: Optional[str] = Field(default=None, alias="errorMessage")
    processing_time_ms: int = Field(alias="processingTimeMs")
    
    @model_serializer
    def serialize_model(self) -> dict[str, Any]:
        """Custom serializer to handle nested Payment model"""
        return {
            'success': self.success,
            'payment': self.payment.serialize_model() if self.payment else None,
            'transaction_id': self.transaction_id,
            'error_message': self.error_message,
            'processing_time_ms': self.processing_time_ms,
        }


class PaymentCompletedEvent(BaseModel):
    """Event sent when payment is completed"""
    model_config = ConfigDict(populate_by_name=True)

    event_type: str = Field(default="PaymentCompleted", alias="eventType")
    payment_id: str = Field(alias="paymentId")
    ride_id: str = Field(alias="rideId")
    rider_id: str = Field(alias="riderId")
    driver_id: str = Field(alias="driverId")
    amount: Decimal
    payment_method: str = Field(alias="paymentMethod")
    transaction_id: str = Field(alias="transactionId")
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    correlation_id: Optional[str] = Field(default=None, alias="correlationId")


class PaymentFailedEvent(BaseModel):
    """Event sent when payment fails"""
    model_config = ConfigDict(populate_by_name=True)

    event_type: str = Field(default="PaymentFailed", alias="eventType")
    payment_id: str = Field(alias="paymentId")
    ride_id: str = Field(alias="rideId")
    rider_id: str = Field(alias="riderId")
    driver_id: str = Field(alias="driverId")
    payment_method: str = Field(alias="paymentMethod")
    reason: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    correlation_id: Optional[str] = Field(default=None, alias="correlationId")
