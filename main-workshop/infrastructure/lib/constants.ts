/**
 * Constants used throughout the infrastructure stack
 */
export const CONSTANTS = {
  // Stack Names
  STACK_NAMES: {
    INFRASTRUCTURE: 'RiderWorkshopInfrastructureStack',
    SERVICES: 'RiderWorkshopServicesStack',
  },

  // Service Names
  SERVICE_NAMES: {
    RIDE_SERVICE: 'ride-service',
    DRIVER_MATCHING_SERVICE: 'driver-matching-service',
    DYNAMIC_PRICING_SERVICE: 'dynamic-pricing-service',
    PAYMENT_PROCESSOR: 'payment-processor',
    PAYMENT_STREAM_PROCESSOR: 'payment-stream-processor',
    RIDE_COMPLETION_SERVICE: 'ride-completion-service',
  },

  // Lambda Function Names (with prefix)
  LAMBDA_FUNCTION_NAMES: {
    RIDE_SERVICE: 'powertools-ride-workshop-ride-service',
    DRIVER_MATCHING_SERVICE: 'powertools-ride-workshop-driver-matching-service',
    DYNAMIC_PRICING_SERVICE: 'powertools-ride-workshop-dynamic-pricing-service',
    PAYMENT_PROCESSOR: 'powertools-ride-workshop-payment-processor',
    PAYMENT_STREAM_PROCESSOR: 'powertools-ride-workshop-payment-stream-processor',
    RIDE_COMPLETION_SERVICE: 'powertools-ride-workshop-ride-completion-service',
  },

  // Table Names
  TABLE_NAMES: {
    RIDES: 'powertools-ride-workshop-Rides',
    DRIVERS: 'powertools-ride-workshop-Drivers',
    PAYMENTS: 'powertools-ride-workshop-Payments',
    PRICING: 'powertools-ride-workshop-Pricing',
    IDEMPOTENCY: 'powertools-ride-workshop-IdempotencyTable',
  },

  // EventBridge
  EVENT_BUS: {
    NAME: 'powertools-ride-workshop-event-bus',
    DESCRIPTION: 'EventBridge bus for workshop microservices communication',
  },

  // Dashboard Names
  DASHBOARD_NAMES: {
    OBSERVABILITY: '1-workshop-observability',
    IDEMPOTENCY: '2-workshop-idempotency',
    BATCH_PROCESSING: '3-workshop-batch-processing',
  },

  // IAM Role Names
  IAM_ROLES: {
    LAMBDA_EXECUTION: 'powertools-ride-workshop-lambda-execution-role',
    DASHBOARD_ACCESS: 'WorkshopDashboardAccessRole',
    PARTICIPANT_SAMPLE: 'WorkshopParticipant-Sample',
  },

  // SSM Parameter Paths
  SSM_PATHS: {
    FEATURE_FLAGS: '/powertools-ride-workshop/features',
  },

  // Secrets Manager
  SECRETS: {
    RUSH_HOUR_MULTIPLIER: 'powertools-workshop/pricing/rush-hour-multiplier',
  },

  // API Gateway
  API_GATEWAY: {
    NAME: 'powertools-ride-workshop-ride-service-api',
    DESCRIPTION: 'API Gateway for Ride Service',
  },

  // Export Keys Prefix
  WORKSHOP_NAME: 'powertools-ride-workshop',

  // Log Group Prefixes
  LOG_GROUPS: {
    LAMBDA_PREFIX: '/aws/lambda/',
  },



  // Load generator
  LOAD_TESTING: {
    CLUSTER_NAME: 'powertools-ride-workshop-load-generator-cluster',
    ECR_REPOSITORY_NAME: 'powertools-ride-workshop-load-generator',
    LOG_GROUP_NAME: '/aws/ecs/powertools-ride-workshop-load-generator',
    DASHBOARD_NAME: 'powertools-ride-workshop-load-generator',
    EXPORT_KEYS: {
      CLUSTER_NAME: 'powertools-ride-workshop-LoadGeneratorClusterName',
      TASK_DEFINITION_ARN: 'powertools-ride-workshop-LoadGeneratorTaskDefinitionArn',
      ECR_REPOSITORY_URI: 'powertools-ride-workshop-LoadGeneratorEcrRepositoryUri',
      VPC_ID: 'powertools-ride-workshop-LoadGeneratorVpcId',
      SECURITY_GROUP_ID: 'powertools-ride-workshop-LoadGeneratorSecurityGroupId',
    },
  },
} as const;

/**
 * Helper functions for working with constants
 */
export class ConstantsHelper {
  /**
   * Get Lambda log group name for a service
   */
  static getLambdaLogGroup(serviceName: string): string {
    return `${CONSTANTS.LOG_GROUPS.LAMBDA_PREFIX}${serviceName}`;
  }

  /**
   * Get all service log groups
   */
  static getAllServiceLogGroups(): string[] {
    return Object.values(CONSTANTS.LAMBDA_FUNCTION_NAMES).map(name =>
      ConstantsHelper.getLambdaLogGroup(name)
    );
  }

  /**
   * Get service display name
   */
  static getServiceDisplayName(serviceName: string): string {
    return serviceName.split('-').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  }

  /**
   * Get export name with prefix
   */
  static getExportName(name: string): string {
    return `${CONSTANTS.WORKSHOP_NAME}-${name}`;
  }
}