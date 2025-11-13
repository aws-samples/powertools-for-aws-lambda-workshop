export interface Location {
  address: string;
  latitude: number;
  longitude: number;
}

export interface Ride {
  rideId: string;
  riderId: string;
  riderName: string;
  pickupLocation: Location;
  destinationLocation: Location;
  status: string;
  driverId?: string;
  driverName?: string;
  finalPrice?: number;
  paymentMethod: string;
  createdAt: string;
  updatedAt: string;
  deviceId?: string;
}

export interface CreateRideRequest {
  riderId: string;
  riderName: string;
  pickupLocation: Location;
  destinationLocation: Location;
  paymentMethod: string;
}

export interface RideCreatedEvent {
  rideId: string;
  riderId: string;
  riderName: string;
  pickupLocation: Location;
  destinationLocation: Location;
  paymentMethod: string;
  timestamp: string;
  eventType: string;
  correlationId?: string;
}
