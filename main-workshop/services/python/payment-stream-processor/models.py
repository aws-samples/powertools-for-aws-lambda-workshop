from datetime import datetime, timezone
from decimal import Decimal
from typing import Any, Dict, Optional

from pydantic import BaseModel, ConfigDict, Field, model_serializer


class PaymentStreamModel(BaseModel):
    """Model for payment stream processing"""
    model_config = ConfigDict(populate_by_name=True)

    success: bool
    payment_id: Optional[str] = Field(default=None, alias="paymentId")
    ride_id: Optional[str] = Field(default=None, alias="rideId")
    rider_id: Optional[str] = Field(default=None, alias="riderId")
    driver_id: Optional[str] = Field(default=None, alias="driverId")
    correlation_id: Optional[str] = Field(default=None, alias="correlationId")
    amount: Optional[str] = None
    payment_method: Optional[str] = Field(default=None, alias="paymentMethod")
    transaction_id: Optional[str] = Field(default=None, alias="transactionId")
    status: Optional[str] = None


class StreamProcessingResult(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    
    success: bool
    payment_id: Optional[str] = Field(default=None, alias="paymentId")
    ride_id: Optional[str] = Field(default=None, alias="rideId")
    rider_id: Optional[str] = Field(default=None, alias="riderId")
    driver_id: Optional[str] = Field(default=None, alias="driverId")
    event_type: Optional[str] = Field(default=None, alias="eventType")
    error_message: Optional[str] = Field(default=None, alias="errorMessage")
    correlation_id: Optional[str] = Field(default=None, alias="correlationId")
    new_image: Optional[Dict[str, Any]] = Field(default=None, alias="newImage")

    @classmethod
    def create_success(
        cls,
        payment_id: Optional[str] = None,
        ride_id: Optional[str] = None,
        rider_id: Optional[str] = None,
        driver_id: Optional[str] = None,
        event_type: Optional[str] = None,
        correlation_id: Optional[str] = None,
    ) -> "StreamProcessingResult":
        return cls(
            success=True,
            payment_id=payment_id,
            ride_id=ride_id,
            rider_id=rider_id,
            driver_id=driver_id,
            event_type=event_type,
            correlation_id=correlation_id,
        )

    @classmethod
    def create_failure(cls, error_message: str) -> "StreamProcessingResult":
        return cls(success=False, error_message=error_message)

    @classmethod
    def create_skipped(cls) -> "StreamProcessingResult":
        return cls(success=True)


class PaymentCompletedEvent(BaseModel):
    """Event sent when payment is completed via stream processing"""
    model_config = ConfigDict(populate_by_name=True)

    event_type: str = Field(default="PaymentCompleted", alias="eventType")
    payment_id: str = Field(alias="paymentId")
    ride_id: str = Field(alias="rideId")
    rider_id: Optional[str] = Field(default=None, alias="riderId")
    driver_id: Optional[str] = Field(default=None, alias="driverId")
    amount: Decimal
    payment_method: str = Field(alias="paymentMethod")
    transaction_id: Optional[str] = Field(default=None, alias="transactionId")
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    correlation_id: Optional[str] = Field(default=None, alias="correlationId")
    
    @model_serializer
    def serialize_model(self) -> dict[str, Any]:
        return {
            'event_type': self.event_type,
            'payment_id': self.payment_id,
            'ride_id': self.ride_id,
            'rider_id': self.rider_id,
            'driver_id': self.driver_id,
            'amount': str(self.amount),
            'payment_method': self.payment_method,
            'transaction_id': self.transaction_id,
            'timestamp': self.timestamp.isoformat(),
            'correlation_id': self.correlation_id,
        }


class PaymentFailedEvent(BaseModel):
    """Event sent when payment fails via stream processing"""
    model_config = ConfigDict(populate_by_name=True)

    event_type: str = Field(default="PaymentFailed", alias="eventType")
    payment_id: str = Field(alias="paymentId")
    ride_id: str = Field(alias="rideId")
    failure_reason: str = Field(alias="failureReason")
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    correlation_id: Optional[str] = Field(default=None, alias="correlationId")
    
    @model_serializer
    def serialize_model(self) -> dict[str, Any]:
        return {
            'event_type': self.event_type,
            'payment_id': self.payment_id,
            'ride_id': self.ride_id,
            'failure_reason': self.failure_reason,
            'timestamp': self.timestamp.isoformat(),
            'correlation_id': self.correlation_id,
        }
