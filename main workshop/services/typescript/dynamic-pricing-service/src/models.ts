export interface Location {
  address: string;
  latitude: number;
  longitude: number;
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

export interface PriceCalculation {
  basePrice: number;
  finalPrice: number;
  surgeMultiplier: number;
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
  paymentMethod: string;
  timestamp: string;
  correlationId?: string;
}

export interface SecretData {
  rushHourMultiplier: number;
  lastUpdated: string;
  description: string;
}
