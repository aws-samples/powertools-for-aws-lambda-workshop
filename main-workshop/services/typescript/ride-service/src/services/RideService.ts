import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  EventBridgeClient,
  PutEventsCommand,
} from '@aws-sdk/client-eventbridge';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import type { APIGatewayProxyEvent } from 'aws-lambda';
import { captureAWSv3Client } from 'aws-xray-sdk-core';
import { randomUUID } from 'crypto';
import type { CreateRideRequest, Ride, RideCreatedEvent } from '../models';

export interface RideCreationResult {
  success: boolean;
  ride?: Ride;
  errorType?: string;
  errorMessage?: string;
}

export class RideService {
  private readonly docClient: DynamoDBDocumentClient;
  private readonly tableName: string;
  private readonly eventBridge: EventBridgeClient;
  private readonly eventBusName: string;

  constructor() {
    const client = new DynamoDBClient({});
    this.docClient = captureAWSv3Client(DynamoDBDocumentClient.from(client));
    this.tableName = process.env.RIDES_TABLE_NAME || 'Rides';
    this.eventBridge = captureAWSv3Client(new EventBridgeClient({}));
    this.eventBusName = process.env.EVENT_BUS_NAME || '';
  }

  async createRide(
    event: APIGatewayProxyEvent,
    deviceId?: string
  ): Promise<RideCreationResult> {
    try {
      // Extract correlation ID from request headers
      const correlationId = this.getHeaderValue(
        event.headers,
        'x-correlation-id'
      );

      // Validate request body
      const requestBody = event.body;
      if (!requestBody) {
        return {
          success: false,
          errorType: 'InvalidRequest',
          errorMessage: 'Request body is required',
        };
      }

      // Parse request body
      let request: CreateRideRequest;
      try {
        request = JSON.parse(requestBody) as CreateRideRequest;
      } catch (error) {
        return {
          success: false,
          errorType: 'JsonException',
          errorMessage: 'Invalid JSON format',
        };
      }

      // Create ride object
      const ride: Ride = {
        rideId: randomUUID(),
        riderId: request.riderId,
        riderName: request.riderName,
        pickupLocation: request.pickupLocation,
        destinationLocation: request.destinationLocation,
        paymentMethod: request.paymentMethod,
        deviceId: deviceId,
        status: 'requested',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Save to DynamoDB
      await this.saveRideToDynamoDB(ride);

      // Send event to EventBridge
      await this.sendRideCreatedEvent(ride, correlationId);

      return {
        success: true,
        ride,
      };
    } catch (error) {
      return {
        success: false,
        errorType: 'UnexpectedError',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async saveRideToDynamoDB(ride: Ride): Promise<void> {
    const item = {
      rideId: ride.rideId,
      riderId: ride.riderId,
      riderName: ride.riderName,
      pickupLocation: JSON.stringify(ride.pickupLocation),
      destinationLocation: JSON.stringify(ride.destinationLocation),
      paymentMethod: ride.paymentMethod,
      deviceId: ride.deviceId || 'unknown',
      status: ride.status,
      createdAt: ride.createdAt,
      updatedAt: ride.updatedAt,
    };

    const command = new PutCommand({
      TableName: this.tableName,
      Item: item,
    });

    await this.docClient.send(command);
  }

  private async sendRideCreatedEvent(
    ride: Ride,
    correlationId?: string
  ): Promise<void> {
    if (!this.eventBusName) {
      return;
    }

    const rideCreatedEvent: RideCreatedEvent = {
      rideId: ride.rideId,
      riderId: ride.riderId,
      riderName: ride.riderName,
      pickupLocation: ride.pickupLocation,
      destinationLocation: ride.destinationLocation,
      paymentMethod: ride.paymentMethod,
      timestamp: new Date().toISOString(),
      eventType: 'RideCreated',
      correlationId,
    };

    const command = new PutEventsCommand({
      Entries: [
        {
          Source: 'ride-service',
          DetailType: 'RideCreated',
          Detail: JSON.stringify(rideCreatedEvent),
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

  private getHeaderValue(
    headers: { [key: string]: string | undefined } | null,
    headerName: string
  ): string | undefined {
    if (!headers) {
      return undefined;
    }

    const headerEntry = Object.entries(headers).find(
      ([key]) => key.toLowerCase() === headerName.toLowerCase()
    );

    return headerEntry?.[1];
  }
}
