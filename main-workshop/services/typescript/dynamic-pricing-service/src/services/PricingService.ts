import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  EventBridgeClient,
  PutEventsCommand,
} from '@aws-sdk/client-eventbridge';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { captureAWSv3Client } from 'aws-xray-sdk-core';
import type {
  PriceCalculatedEvent,
  PriceCalculation,
  RideCreatedEvent,
} from '../models';

export interface PricingResult {
  success: boolean;
  rideId?: string;
  riderId?: string;
  finalPrice?: number;
  basePrice?: number;
  surgeMultiplier?: number;
  errorType?: string;
  errorMessage?: string;
}

export class PricingService {
  private readonly docClient: DynamoDBDocumentClient;
  private readonly tableName: string;
  private readonly eventBridge: EventBridgeClient;
  private readonly eventBusName: string;

  // Pricing constants
  private readonly MIN_BASE_PRICE = 5.0;
  private readonly MAX_BASE_PRICE = 20.0;

  constructor() {
    const client = new DynamoDBClient({});
    this.docClient = captureAWSv3Client(DynamoDBDocumentClient.from(client));
    this.tableName = process.env.PRICING_TABLE_NAME || 'Pricing';
    this.eventBridge = captureAWSv3Client(new EventBridgeClient({}));
    this.eventBusName = process.env.EVENT_BUS_NAME || '';
  }

  async processRideCreatedEvent(
    rideCreatedEvent: RideCreatedEvent,
    rushHourMultiplier: number
  ): Promise<PricingResult> {
    const result: PricingResult = {
      success: false,
    };

    try {
      if (!rideCreatedEvent) {
        result.errorType = 'DeserializationError';
        result.errorMessage = 'Failed to deserialize ride created event';
        return result;
      }

      // Validate event
      if (
        !rideCreatedEvent.pickupLocation ||
        !rideCreatedEvent.destinationLocation
      ) {
        result.errorType = 'ValidationError';
        result.errorMessage = 'Missing pickup or destination location';
        result.rideId = rideCreatedEvent.rideId;
        result.riderId = rideCreatedEvent.riderId;
        return result;
      }

      // Process the ride for pricing
      return await this.processRideForPricing(
        rideCreatedEvent,
        rushHourMultiplier
      );
    } catch (error) {
      result.errorType = 'UnexpectedError';
      result.errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw error;
    }
  }

  private async processRideForPricing(
    rideCreatedEvent: RideCreatedEvent,
    rushHourMultiplier: number
  ): Promise<PricingResult> {
    const result: PricingResult = {
      success: false,
      rideId: rideCreatedEvent.rideId,
      riderId: rideCreatedEvent.riderId,
    };

    try {
      // Calculate price
      const priceCalculation = this.calculatePrice(rushHourMultiplier);

      // Save price calculation to DynamoDB
      await this.savePriceCalculation(
        rideCreatedEvent.rideId,
        priceCalculation
      );

      // Publish PriceCalculated event
      await this.sendPriceCalculatedEvent(rideCreatedEvent, priceCalculation);

      result.success = true;
      result.finalPrice = priceCalculation.finalPrice;
      result.basePrice = priceCalculation.basePrice;
      result.surgeMultiplier = priceCalculation.surgeMultiplier;

      return result;
    } catch (error) {
      result.errorType = 'UnexpectedError';
      result.errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw error;
    }
  }

  private calculatePrice(rushHourMultiplier: number): PriceCalculation {
    // Generate random base price between MIN and MAX
    const basePrice =
      Math.random() * (this.MAX_BASE_PRICE - this.MIN_BASE_PRICE) +
      this.MIN_BASE_PRICE;
    const roundedBasePrice = Math.round(basePrice * 100) / 100;
    const finalPrice =
      Math.round(roundedBasePrice * rushHourMultiplier * 100) / 100;

    return {
      basePrice: roundedBasePrice,
      surgeMultiplier: rushHourMultiplier,
      finalPrice: finalPrice,
      createdAt: new Date().toISOString(),
    };
  }

  private async savePriceCalculation(
    rideId: string,
    calculation: PriceCalculation
  ): Promise<void> {
    const item = {
      rideId: rideId,
      basePrice: calculation.basePrice,
      finalPrice: calculation.finalPrice,
      surgeMultiplier: calculation.surgeMultiplier,
      createdAt: calculation.createdAt,
    };

    const command = new PutCommand({
      TableName: this.tableName,
      Item: item,
    });

    await this.docClient.send(command);
  }

  private async sendPriceCalculatedEvent(
    rideEvent: RideCreatedEvent,
    priceCalculation: PriceCalculation
  ): Promise<void> {
    if (!this.eventBusName) {
      return;
    }

    const priceCalculatedEvent: PriceCalculatedEvent = {
      rideId: rideEvent.rideId,
      riderId: rideEvent.riderId,
      riderName: rideEvent.riderName,
      pickupLocation: rideEvent.pickupLocation,
      dropoffLocation: rideEvent.destinationLocation,
      estimatedPrice: priceCalculation.finalPrice,
      basePrice: priceCalculation.basePrice,
      surgeMultiplier: priceCalculation.surgeMultiplier,
      paymentMethod: rideEvent.paymentMethod,
      timestamp: new Date().toISOString(),
      correlationId: rideEvent.correlationId,
    };

    const command = new PutEventsCommand({
      Entries: [
        {
          Source: 'dynamic-pricing-service',
          DetailType: 'PriceCalculated',
          Detail: JSON.stringify(priceCalculatedEvent),
          EventBusName: this.eventBusName,
        },
      ],
    });

    const result = await this.eventBridge.send(command);

    const failedEntries = result.Entries?.filter((e: any) => e.ErrorCode);
    if (failedEntries && failedEntries.length > 0) {
      throw new Error(`Failed to send event: ${failedEntries[0].ErrorCode}`);
    }
  }
}
