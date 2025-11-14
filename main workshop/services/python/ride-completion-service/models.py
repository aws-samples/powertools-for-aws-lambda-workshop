from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class PaymentCompletedEvent(BaseModel):
    """Represents a payment completion event received from EventBridge"""
    model_config = ConfigDict(populate_by_name=True)

    payment_id: str = Field(alias="paymentId")
    ride_id: str = Field(alias="rideId")
    rider_id: str = Field(alias="riderId")
    driver_id: str = Field(alias="driverId")
    amount: Decimal
    payment_method: str = Field(alias="paymentMethod")
    transaction_id: str = Field(alias="transactionId")
    timestamp: str
    correlation_id: Optional[str] = Field(default=None, alias="correlationId")


class RideCompletionResult(BaseModel):
    """Result of ride completion processing"""
    model_config = ConfigDict(populate_by_name=True)

    payment_id: str = Field(default="", alias="paymentId")
    ride_id: str = Field(default="", alias="rideId")
    rider_id: str = Field(default="", alias="riderId")
    driver_id: str = Field(default="", alias="driverId")
    payment_method: str = Field(default="", alias="paymentMethod")
    amount: Decimal = Decimal("0")
    ride_update_successful: bool = Field(default=False, alias="rideUpdateSuccessful")
    driver_update_successful: bool = Field(default=False, alias="driverUpdateSuccessful")
    success: bool = False
    error_message: str = Field(default="", alias="errorMessage")
    error_type: str = Field(default="", alias="errorType")


class DriverStatus:
    """Constants for driver status values"""

    AVAILABLE = "available"
    BUSY = "busy"


class RideStatus:
    """Constants for ride status values"""

    REQUESTED = "requested"
    DRIVER_ASSIGNED = "driver-assigned"
    IN_PROGRESS = "in-progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    PAYMENT_FAILED = "payment_failed"
