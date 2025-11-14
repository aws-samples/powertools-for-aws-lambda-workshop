export interface Location {
  address: string;
  latitude: number;
  longitude: number;
}

export interface Driver {
  driverId: string;
  driverName: string;
  currentLocation: Location;
  status: string;
  rating: number;
  createdAt: string;
  updatedAt: string;
}

export interface DriverMatch {
  rideId: string;
  driverId: string;
  driverName: string;
  estimatedArrivalMinutes: number;
  distanceKm: number;
  createdAt: string;
}

export interface PriceCalculatedEvent {
  rideId: string;
  riderId: string;
  riderName: string;
  pickupLocation: Location;
  dropoffLocation: Location;
  estimatedPrice: number;
  basePrice: number;
  surgeMultiplier: number;
  distance?: number;
  paymentMethod: string;
  timestamp: string;
  correlationId?: string;
}

export interface DriverAssignedEvent {
  eventType: string;
  rideId: string;
  riderId: string;
  riderName: string;
  driverId: string;
  driverName: string;
  estimatedPrice: number;
  basePrice: number;
  surgeMultiplier: number;
  pickupLocation: Location;
  dropoffLocation: Location;
  estimatedArrivalMinutes: number;
  distanceKm: number;
  paymentMethod: string;
  timestamp: string;
  correlationId?: string;
}
