export interface PaymentStreamEvent {
  success: boolean;
  paymentId?: string;
  rideId?: string;
  riderId?: string;
  driverId?: string;
  correlationId?: string;
  amount?: string;
  paymentMethod?: string;
  transactionId?: string;
  status?: string;
}

export interface PaymentCompletedEvent {
  EventType: string;
  PaymentId?: string;
  RideId?: string;
  RiderId?: string;
  DriverId?: string;
  Amount: number;
  PaymentMethod?: string;
  TransactionId?: string;
  Timestamp: string;
  CorrelationId?: string;
}

export class BatchException extends Error {
  constructor(
    message: string,
    public paymentModel: PaymentStreamEvent
  ) {
    super(message);
    this.name = 'BatchException';
  }
}
