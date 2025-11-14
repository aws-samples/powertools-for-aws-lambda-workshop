from datetime import datetime, timezone
from decimal import Decimal
from enum import Enum
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict, Field, model_serializer


class RideStatus(str, Enum):
    REQUESTED = "requested"
    MATCHED = "driver-assigned"
    IN_PROGRESS = "in-progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class Location(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    
    address: str
    latitude: float
    longitude: float


class Ride(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    
    ride_id: str = Field(alias="rideId")
    rider_id: str = Field(alias="riderId")
    rider_name: str = Field(alias="riderName")
    pickup_location: Location = Field(alias="pickupLocation")
    destination_location: Location = Field(alias="destinationLocation")
    status: RideStatus = RideStatus.REQUESTED
    driver_id: Optional[str] = Field(default=None, alias="driverId")
    driver_name: Optional[str] = Field(default=None, alias="driverName")
    estimated_price: Optional[Decimal] = Field(default=None, alias="estimatedPrice")
    final_price: Optional[Decimal] = Field(default=None, alias="finalPrice")
    payment_method: str = Field(default="credit-card", alias="paymentMethod")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), alias="createdAt")
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), alias="updatedAt")
    device_id: Optional[str] = Field(default=None, alias="deviceId")

    @model_serializer
    def serialize_model(self) -> dict[str, Any]:
        return {
            "ride_id": self.ride_id,
            "rider_id": self.rider_id,
            "rider_name": self.rider_name,
            "pickup_location": self.pickup_location.model_dump(),
            "destination_location": self.destination_location.model_dump(),
            "status": self.status.value,
            "driver_id": self.driver_id,
            "driver_name": self.driver_name,
            "estimated_price": str(self.estimated_price) if self.estimated_price else None,
            "final_price": str(self.final_price) if self.final_price else None,
            "payment_method": self.payment_method,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
            "device_id": self.device_id,
        }

    def to_dict(self) -> dict:
        return {
            "rideId": self.ride_id,
            "riderId": self.rider_id,
            "riderName": self.rider_name,
            "pickupLocation": self.pickup_location.dict(),
            "destinationLocation": self.destination_location.dict(),
            "status": self.status.value,
            "driverId": self.driver_id,
            "driverName": self.driver_name,
            "estimatedPrice": (
                str(self.estimated_price) if self.estimated_price else None
            ),
            "finalPrice": str(self.final_price) if self.final_price else None,
            "paymentMethod": self.payment_method,
            "createdAt": self.created_at.isoformat(),
            "updatedAt": self.updated_at.isoformat(),
            "deviceId": self.device_id,
        }


class RideCreationResult(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    
    success: bool
    ride: Optional[Ride] = None
    error_message: Optional[str] = Field(default=None, alias="errorMessage")
    error_code: Optional[str] = Field(default=None, alias="errorCode")
