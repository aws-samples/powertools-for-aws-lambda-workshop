export interface Payment {
  paymentId: string;
  rideId: string;
  riderId: string;
  driverId: string;
  amount: number;
  paymentMethod: string;
  status: string; // pending, processing, completed, failed
  failureReason?: string;
  transactionId?: string;
  createdAt: string;
  updatedAt: string;
  correlationId?: string;
}

export interface PaymentResult {
  success: boolean;
  payment?: Payment;
  transactionId?: string;
  errorMessage?: string;
  processingTimeMs: number;
}

export interface PaymentGatewayResult {
  success: boolean;
  transactionId?: string;
  errorMessage?: string;
  processingTimeMs: number;
}

export interface DriverAssignedEvent {
  eventType: string;
  rideId: string;
  riderId: string;
  riderName: string;
  driverId: string;
  driverName: string;
  estimatedPrice: number;
  paymentMethod: string;
  timestamp: string;
  correlationId?: string;
}

export interface PaymentCompletedEvent {
  eventType: string;
  paymentId: string;
  rideId: string;
  riderId: string;
  driverId: string;
  amount: number;
  paymentMethod: string;
  transactionId?: string;
  timestamp: string;
  correlationId?: string;
}

export interface PaymentFailedEvent {
  eventType: string;
  paymentId: string;
  rideId: string;
  riderId: string;
  driverId: string;
  amount: number;
  paymentMethod: string;
  failureReason: string;
  timestamp: string;
  correlationId?: string;
}
