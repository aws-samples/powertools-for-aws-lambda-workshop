/**
 * EventBridge CloudWatch Event wrapper
 */
export interface CloudWatchEvent<T> {
  version: string;
  id: string;
  'detail-type': string;
  source: string;
  account: string;
  time: string;
  region: string;
  resources: string[];
  detail: T;
}

/**
 * Represents a payment completion event received from EventBridge
 */
export interface PaymentCompletedEvent {
  paymentId: string;
  rideId: string;
  riderId: string;
  driverId: string;
  amount: number;
  paymentMethod: string;
  transactionId: string;
  timestamp: string;
  correlationId?: string;
}

/**
 * Result of ride completion processing
 */
export interface RideCompletionResult {
  paymentId: string;
  rideId: string;
  riderId: string;
  driverId: string;
  paymentMethod: string;
  amount: number;
  rideUpdateSuccessful: boolean;
  driverUpdateSuccessful: boolean;
  success: boolean;
  errorMessage: string;
  errorType: string;
}
