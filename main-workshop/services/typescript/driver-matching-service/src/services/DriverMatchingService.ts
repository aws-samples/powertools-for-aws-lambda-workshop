import {
  DynamoDBClient,
  ScanCommand,
  UpdateItemCommand,
} from '@aws-sdk/client-dynamodb';
import {
  EventBridgeClient,
  PutEventsCommand,
} from '@aws-sdk/client-eventbridge';
import { captureAWSv3Client } from 'aws-xray-sdk-core';
import type {
  Driver,
  DriverAssignedEvent,
  PriceCalculatedEvent,
} from '../models';

export interface DriverMatchingResult {
  success: boolean;
  rideId?: string;
  availableDriversCount?: number;
  assignedDriverId?: string;
  errorMessage?: string;
}

export class DriverMatchingService {
  private readonly dynamoDb: DynamoDBClient;
  private readonly eventBridge: EventBridgeClient;
  private readonly driversTableName: string;
  private readonly ridesTableName: string;
  private readonly eventBusName: string;

  constructor() {
    this.dynamoDb = captureAWSv3Client(new DynamoDBClient({}));
    this.eventBridge = captureAWSv3Client(new EventBridgeClient({}));
    this.driversTableName = process.env.DRIVERS_TABLE_NAME || 'Drivers';
    this.ridesTableName =
      process.env.RIDES_TABLE_NAME || 'powertools-ride-workshop-Rides';
    this.eventBusName = process.env.EVENT_BUS_NAME || '';
  }

  async processPriceCalculatedEvent(
    priceCalculatedEvent: PriceCalculatedEvent
  ): Promise<DriverMatchingResult> {
    const result: DriverMatchingResult = {
      success: false,
    };

    try {
      if (!priceCalculatedEvent) {
        result.errorMessage = 'Failed to deserialize price calculated event';
        return result;
      }

      return await this.processRideRequest(priceCalculatedEvent);
    } catch (error) {
      result.errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw error;
    }
  }

  private async processRideRequest(
    request: PriceCalculatedEvent
  ): Promise<DriverMatchingResult> {
    const result: DriverMatchingResult = {
      success: false,
      rideId: request.rideId,
    };

    try {
      // Get available drivers
      const availableDrivers = await this.getAvailableDrivers();
      result.availableDriversCount = availableDrivers.length;

      if (availableDrivers.length === 0) {
        await this.updateRideWithDriver(
          request.rideId,
          '',
          'no-driver-available'
        );
        result.success = false;
        result.errorMessage = 'No available drivers';
        return result;
      }

      // Select the first available driver
      const selectedDriver = availableDrivers[0];
      result.assignedDriverId = selectedDriver.driverId;

      // Update driver status to busy
      // Commented out for demo purposes - we don't need to track real status in the DB
      // await this.updateDriverStatus(selectedDriver.driverId, 'busy');

      // Update ride with driver information and status
      await this.updateRideWithDriver(
        request.rideId,
        selectedDriver.driverId,
        'driver-assigned'
      );

      // Send DriverAssignedEvent to payment processor
      const driverAssignedEvent = this.createDriverAssignedEvent(
        request,
        selectedDriver
      );
      await this.sendDriverAssignedEvent(driverAssignedEvent);

      result.success = true;

      return result;
    } catch (error) {
      result.success = false;
      result.errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      throw error;
    }
  }

  private async getAvailableDrivers(): Promise<Driver[]> {
    // For demo purposes: fetch all drivers without status filter
    const command = new ScanCommand({
      TableName: this.driversTableName,
      // FilterExpression: '#status = :status',
      // ExpressionAttributeNames: {
      //   '#status': 'status',
      // },
      // ExpressionAttributeValues: {
      //   ':status': { S: 'available' },
      // },
    });

    const response = await this.dynamoDb.send(command);

    const drivers: Driver[] = [];
    if (response.Items) {
      for (const item of response.Items) {
        try {
          const driver = this.deserializeDriver(item);
          drivers.push(driver);
        } catch (error) {
          // Skip invalid driver records
        }
      }
    }

    return drivers;
  }

  private async updateDriverStatus(
    driverId: string,
    status: string
  ): Promise<void> {
    const command = new UpdateItemCommand({
      TableName: this.driversTableName,
      Key: {
        driverId: { S: driverId },
      },
      UpdateExpression: 'SET #status = :status, updatedAt = :updatedAt',
      ExpressionAttributeNames: {
        '#status': 'status',
      },
      ExpressionAttributeValues: {
        ':status': { S: status },
        ':updatedAt': { S: new Date().toISOString() },
      },
    });

    await this.dynamoDb.send(command);
  }

  private async updateRideWithDriver(
    rideId: string,
    driverId: string,
    status: string
  ): Promise<void> {
    const command = new UpdateItemCommand({
      TableName: this.ridesTableName,
      Key: {
        rideId: { S: rideId },
      },
      UpdateExpression:
        'SET driverId = :driverId, #status = :status, updatedAt = :updatedAt',
      ExpressionAttributeNames: {
        '#status': 'status',
      },
      ExpressionAttributeValues: {
        ':driverId': { S: driverId },
        ':status': { S: status },
        ':updatedAt': { S: new Date().toISOString() },
      },
    });

    await this.dynamoDb.send(command);
  }

  private async sendDriverAssignedEvent(
    driverAssignedEvent: DriverAssignedEvent
  ): Promise<void> {
    if (!this.eventBusName) {
      return;
    }

    const command = new PutEventsCommand({
      Entries: [
        {
          Source: 'driver-matching-service',
          DetailType: 'DriverAssigned',
          Detail: JSON.stringify(driverAssignedEvent),
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

  private deserializeDriver(item: Record<string, any>): Driver {
    const currentLocation = this.parseLocation(item);

    return {
      driverId: item.driverId?.S || '',
      driverName: this.getDriverName(item),
      currentLocation: currentLocation,
      status: item.status?.S || 'available',
      rating: item.rating?.N ? Number.parseFloat(item.rating.N) : 5.0,
      createdAt: item.createdAt?.S || new Date().toISOString(),
      updatedAt: this.getUpdatedAt(item),
    };
  }

  private parseLocation(item: Record<string, any>): {
    address: string;
    latitude: number;
    longitude: number;
  } {
    // Try currentLocation field first
    if (item.currentLocation?.S) {
      try {
        return JSON.parse(item.currentLocation.S);
      } catch (error) {
        // Fall through to default
      }
    }

    // Try location field
    if (item.location?.S) {
      try {
        return JSON.parse(item.location.S);
      } catch (error) {
        // Fall through to default
      }
    }

    // Return default location
    return {
      address: '',
      latitude: 0,
      longitude: 0,
    };
  }

  private getDriverName(item: Record<string, any>): string {
    if (item.driverName?.S) {
      return item.driverName.S;
    }
    if (item.name?.S) {
      return item.name.S;
    }
    return 'Unknown Driver';
  }

  private getUpdatedAt(item: Record<string, any>): string {
    if (item.updatedAt?.S) {
      return item.updatedAt.S;
    }
    if (item.lastUpdated?.S) {
      return item.lastUpdated.S;
    }
    return new Date().toISOString();
  }

  private createDriverAssignedEvent(
    request: PriceCalculatedEvent,
    driver: Driver
  ): DriverAssignedEvent {
    return {
      eventType: 'DriverAssigned',
      rideId: request.rideId,
      riderId: request.riderId,
      riderName: request.riderName,
      driverId: driver.driverId,
      driverName: driver.driverName,
      estimatedPrice: request.estimatedPrice,
      basePrice: request.basePrice,
      surgeMultiplier: request.surgeMultiplier,
      pickupLocation: request.pickupLocation,
      dropoffLocation: request.dropoffLocation,
      estimatedArrivalMinutes: 0,
      distanceKm: 0,
      paymentMethod: request.paymentMethod,
      timestamp: new Date().toISOString(),
      correlationId: request.correlationId,
    };
  }
}
