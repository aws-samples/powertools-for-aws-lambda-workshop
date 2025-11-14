/**
 * Stack Configuration - Export keys for cross-stack references
 */

const PREFIX = 'powertools-ride-workshop';

export const EXPORT_KEYS = {
  ridesTableArn: `${PREFIX}-RidesTableArn`,
  ridesTableName: `${PREFIX}-RidesTableName`,
  driversTableArn: `${PREFIX}-DriversTableArn`,
  driversTableName: `${PREFIX}-DriversTableName`,
  paymentsTableArn: `${PREFIX}-PaymentsTableArn`,
  paymentsTableName: `${PREFIX}-PaymentsTableName`,
  paymentsTableStreamArn: `${PREFIX}-PaymentsTableStreamArn`,
  pricingTableArn: `${PREFIX}-PricingTableArn`,
  pricingTableName: `${PREFIX}-PricingTableName`,
  idempotencyTableArn: `${PREFIX}-IdempotencyTableArn`,
  idempotencyTableName: `${PREFIX}-IdempotencyTableName`,
  eventBusArn: `${PREFIX}-EventBusArn`,
  eventBusName: `${PREFIX}-EventBusName`,
  lambdaExecutionRoleArn: `${PREFIX}-LambdaExecutionRoleArn`,
  rushHourMultiplierSecretArn: `${PREFIX}-RushHourMultiplierSecretArn`,
  rideServiceApiUrl: `${PREFIX}-RideServiceApiURL`,
  rideServiceApiId: `${PREFIX}-RideServiceApiId`,
  rideServiceApiRootResourceId: `${PREFIX}-RideServiceApiRootResourceId`,
  ridesResourceId: `${PREFIX}-RidesResourceId`,
} as const;

export interface InfrastructureReferences {
  tables: {
    rides: { arn: string; name: string };
    drivers: { arn: string; name: string };
    payments: { arn: string; name: string; streamArn: string };
    pricing: { arn: string; name: string };
    idempotency: { arn: string; name: string };
  };
  eventBus: { arn: string; name: string };
  executionRole: { arn: string };
  rushHourMultiplierSecretArn: string;
}
