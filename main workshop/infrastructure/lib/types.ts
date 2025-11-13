/**
 * Type definitions for the infrastructure stack
 */

import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as events from 'aws-cdk-lib/aws-events';
import * as iam from 'aws-cdk-lib/aws-iam';

/**
 * Interface for all microservices in the workshop
 */
export interface WorkshopServices {
  readonly rideService: lambda.Function;
  readonly driverMatchingService: lambda.Function;
  readonly dynamicPricingService: lambda.Function;
  readonly paymentProcessor: lambda.Function;
  readonly paymentStreamProcessor: lambda.Function;
  readonly rideCompletionService: lambda.Function;
}

/**
 * Interface for all DynamoDB tables in the workshop
 */
export interface WorkshopTables {
  readonly ridesTable: dynamodb.Table;
  readonly driversTable: dynamodb.Table;
  readonly paymentsTable: dynamodb.Table;
  readonly pricingTable: dynamodb.Table;
}

/**
 * Interface for workshop infrastructure resources
 */
export interface WorkshopInfrastructure {
  readonly eventBus: events.EventBus;
  readonly lambdaExecutionRole: iam.Role;
  readonly tables: WorkshopTables;
}

/**
 * Configuration for service creation
 */
export interface ServiceCreationConfig {
  readonly serviceName: string;
  readonly config: any; // This would ideally be more specific based on service config structure
  readonly infrastructureRefs: any; // This would ideally be more specific
  readonly role: iam.Role;
}

/**
 * Dashboard configuration
 */
export interface DashboardConfiguration {
  readonly enableObservability: boolean;
  readonly enableIdempotency: boolean;
  readonly enableBatchProcessing: boolean;
  readonly region: string;
  readonly accountId: string;
}

/**
 * Service event patterns for EventBridge rules
 */
export interface ServiceEventPattern {
  readonly source: string[];
  readonly detailType: string[];
}

/**
 * Common service event patterns
 */
export const SERVICE_EVENT_PATTERNS = {
  RIDE_CREATED: {
    source: ['ride-service'],
    detailType: ['RideCreated'],
  },
  PRICE_CALCULATED: {
    source: ['dynamic-pricing-service'],
    detailType: ['PriceCalculated'],
  },
  DRIVER_ASSIGNED: {
    source: ['driver-matching-service'],
    detailType: ['DriverAssigned'],
  },
  PAYMENT_COMPLETED: {
    source: ['payment-processor'],
    detailType: ['PaymentCompleted'],
  },
  STREAM_PAYMENT_COMPLETED: {
    source: ['payment-stream-processor'],
    detailType: ['PaymentCompleted'],
  },
} as const;

/**
 * Lambda function configuration
 */
export interface LambdaConfiguration {
  readonly timeout?: number;
  readonly memorySize?: number;
  readonly environment?: { [key: string]: string };
  readonly reservedConcurrency?: number;
}

/**
 * Default Lambda configurations
 */
export const DEFAULT_LAMBDA_CONFIG: LambdaConfiguration = {
  timeout: 30,
  memorySize: 512,
  reservedConcurrency: 10,
} as const;

/**
 * DynamoDB table configuration
 */
export interface TableConfiguration {
  readonly partitionKey: { name: string; type: dynamodb.AttributeType };
  readonly sortKey?: { name: string; type: dynamodb.AttributeType };
  readonly billingMode: dynamodb.BillingMode;
  readonly removalPolicy: any; // CDK RemovalPolicy
  readonly stream?: dynamodb.StreamViewType;
  readonly globalSecondaryIndexes?: GlobalSecondaryIndexConfig[];
}

/**
 * Global Secondary Index configuration
 */
export interface GlobalSecondaryIndexConfig {
  readonly indexName: string;
  readonly partitionKey: { name: string; type: dynamodb.AttributeType };
  readonly sortKey?: { name: string; type: dynamodb.AttributeType };
}

/**
 * Deployment environment types
 */
export type DeploymentEnvironment = 'development' | 'staging' | 'production' | 'workshop';

/**
 * Environment-specific configuration
 */
export interface EnvironmentConfig {
  readonly environment: DeploymentEnvironment;
  readonly enableXRayTracing: boolean;
  readonly enableDetailedMonitoring: boolean;
  readonly enableDashboards: boolean;
  readonly logRetentionDays: number;
  readonly cleanDeploy: boolean;
}

/**
 * Default environment configurations
 */
export const ENVIRONMENT_CONFIGS: Record<DeploymentEnvironment, EnvironmentConfig> = {
  development: {
    environment: 'development',
    enableXRayTracing: true,
    enableDetailedMonitoring: true,
    enableDashboards: true,
    logRetentionDays: 7,
    cleanDeploy: true,
  },
  staging: {
    environment: 'staging',
    enableXRayTracing: true,
    enableDetailedMonitoring: true,
    enableDashboards: true,
    logRetentionDays: 30,
    cleanDeploy: false,
  },
  production: {
    environment: 'production',
    enableXRayTracing: true,
    enableDetailedMonitoring: true,
    enableDashboards: true,
    logRetentionDays: 365,
    cleanDeploy: false,
  },
  workshop: {
    environment: 'workshop',
    enableXRayTracing: true,
    enableDetailedMonitoring: true,
    enableDashboards: true,
    logRetentionDays: 3,
    cleanDeploy: true,
  },
} as const;