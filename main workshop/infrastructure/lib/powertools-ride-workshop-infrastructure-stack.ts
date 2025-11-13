import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as events from 'aws-cdk-lib/aws-events';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as cr from 'aws-cdk-lib/custom-resources';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as path from 'path';
import { WorkshopDashboards } from './dashboards/workshop-dashboards';
import { CONSTANTS } from './constants';
import { EnvironmentConfig, ENVIRONMENT_CONFIGS } from './types';
import { EXPORT_KEYS } from './config/stack-config';

export interface RiderWorkshopInfrastructureStackProps extends cdk.StackProps {
  cleanDeploy?: boolean;
  environmentConfig?: EnvironmentConfig;
}

/**
 * Infrastructure stack for the PowertoolsRide workshop
 * Contains all shared resources: DynamoDB tables, EventBridge bus, IAM roles, and dashboards
 */
export class RiderWorkshopInfrastructureStack extends cdk.Stack {
  public websiteUrl: cdk.CfnOutput;
  public eventBus: events.EventBus;

  // DynamoDB Tables
  public ridesTable: dynamodb.Table;
  public driversTable: dynamodb.Table;
  public paymentsTable: dynamodb.Table;
  public pricingTable: dynamodb.Table;
  public idempotencyTable: dynamodb.Table;

  // IAM Roles
  public lambdaExecutionRole: iam.Role;

  // Secrets Manager
  public rushHourMultiplierSecret: secretsmanager.Secret;

  public workshopDashboards: WorkshopDashboards;


  constructor(scope: Construct, id: string, props: RiderWorkshopInfrastructureStackProps = {}) {
    super(scope, id, props);


    // Create custom EventBridge bus for all microservices communication
    this.eventBus = new events.EventBus(this, 'PowertoolsRideEventBus', {
      eventBusName: CONSTANTS.EVENT_BUS.NAME,
      description: CONSTANTS.EVENT_BUS.DESCRIPTION,
    });

    // Create DynamoDB Tables
    this.createDynamoDBTables(props.cleanDeploy);

    // Create Secrets Manager secrets
    this.createSecrets(props.cleanDeploy);

    // Create IAM Roles
    this.createIAMRoles();

    // Create workshop dashboards (moved from services stack to avoid hotswap issues)
    this.createDashboards();

    // Seed Drivers table with initial data
    this.seedDriversTable();

    // Create CDK exports for all resources that services need to reference
    this.createExports();
  }

  private seedDriversTable(): void {
    // Create Lambda function to seed drivers
    const seedDriversFunction = new lambda.Function(this, 'SeedDriversFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, 'seed-drivers')),
      timeout: cdk.Duration.minutes(5),
      memorySize: 512,
      logRetention: logs.RetentionDays.ONE_WEEK,
      description: 'Seeds Drivers table with initial driver data',
    });

    // Grant permissions to write to Drivers table
    this.driversTable.grantWriteData(seedDriversFunction);

    // Create custom resource provider
    const provider = new cr.Provider(this, 'SeedDriversProvider', {
      onEventHandler: seedDriversFunction,
      logRetention: logs.RetentionDays.ONE_WEEK,
    });

    // Create custom resource
    new cdk.CustomResource(this, 'SeedDriversResource', {
      serviceToken: provider.serviceToken,
      properties: {
        TableName: this.driversTable.tableName,
        DriverCount: '200',
        // Add timestamp to force update on every deployment if needed
        Timestamp: Date.now().toString(),
      },
    });
  }

  private createDynamoDBTables(cleanDeploy?: boolean): void {
    const removalPolicy = cleanDeploy === false ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY;

    const tableDefaults = {
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy,
      pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
      contributorInsightsSpecification: { enabled: true },
    };

    this.ridesTable = new dynamodb.Table(this, 'RideTable', {
      ...tableDefaults,
      tableName: CONSTANTS.TABLE_NAMES.RIDES,
      partitionKey: { name: 'rideId', type: dynamodb.AttributeType.STRING },
    });
    this.ridesTable.addGlobalSecondaryIndex({
      indexName: 'StatusIndex',
      partitionKey: { name: 'status', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'createdAt', type: dynamodb.AttributeType.STRING },
    });

    this.driversTable = new dynamodb.Table(this, 'DriverTable', {
      ...tableDefaults,
      tableName: CONSTANTS.TABLE_NAMES.DRIVERS,
      partitionKey: { name: 'driverId', type: dynamodb.AttributeType.STRING },
    });
    this.driversTable.addGlobalSecondaryIndex({
      indexName: 'StatusIndex',
      partitionKey: { name: 'status', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'lastUpdated', type: dynamodb.AttributeType.STRING },
    });

    this.paymentsTable = new dynamodb.Table(this, 'PaymentTable', {
      ...tableDefaults,
      tableName: CONSTANTS.TABLE_NAMES.PAYMENTS,
      partitionKey: { name: 'paymentId', type: dynamodb.AttributeType.STRING },
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
    });
    this.paymentsTable.addGlobalSecondaryIndex({
      indexName: 'RideId-Index',
      partitionKey: { name: 'rideId', type: dynamodb.AttributeType.STRING },
    });

    this.pricingTable = new dynamodb.Table(this, 'PricingTable', {
      ...tableDefaults,
      tableName: CONSTANTS.TABLE_NAMES.PRICING,
      partitionKey: { name: 'rideId', type: dynamodb.AttributeType.STRING },
    });

    // Idempotency table for Powertools idempotency utility
    this.idempotencyTable = new dynamodb.Table(this, 'IdempotencyTable', {
      ...tableDefaults,
      tableName: CONSTANTS.TABLE_NAMES.IDEMPOTENCY,
      partitionKey: { name: 'id', type: dynamodb.AttributeType.STRING },
      timeToLiveAttribute: 'expiration',
    });
  }

  private createSecrets(cleanDeploy?: boolean): void {
    const removalPolicy = cleanDeploy === false ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY;

    this.rushHourMultiplierSecret = new secretsmanager.Secret(this, 'RushHourMultiplierSecret', {
      secretName: CONSTANTS.SECRETS.RUSH_HOUR_MULTIPLIER,
      description: 'Rush hour pricing multiplier for dynamic-pricing-service',
      secretStringValue: cdk.SecretValue.unsafePlainText(JSON.stringify({
        rushHourMultiplier: 1.5,
        lastUpdated: new Date().toISOString(),
        description: "Multiplier applied during rush hour periods"
      })),
      removalPolicy,
    });
  }

  private createIAMRoles(): void {
    this.lambdaExecutionRole = new iam.Role(this, 'LambdaExecutionRole', {
      roleName: CONSTANTS.IAM_ROLES.LAMBDA_EXECUTION,
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
    });

    const tables = [this.ridesTable, this.driversTable, this.paymentsTable, this.pricingTable, this.idempotencyTable];
    this.lambdaExecutionRole.addToPolicy(new iam.PolicyStatement({
      actions: ['dynamodb:GetItem', 'dynamodb:PutItem', 'dynamodb:UpdateItem', 'dynamodb:DeleteItem', 'dynamodb:Scan', 'dynamodb:Query'],
      resources: tables.flatMap(t => [t.tableArn, `${t.tableArn}/index/*`]),
    }));

    this.lambdaExecutionRole.addToPolicy(new iam.PolicyStatement({
      actions: ['events:PutEvents'],
      resources: [this.eventBus.eventBusArn],
    }));

    this.lambdaExecutionRole.addToPolicy(new iam.PolicyStatement({
      actions: ['xray:PutTraceSegments', 'xray:PutTelemetryRecords'],
      resources: ['*'],
    }));

    this.lambdaExecutionRole.addToPolicy(new iam.PolicyStatement({
      actions: ['secretsmanager:GetSecretValue'],
      resources: [this.rushHourMultiplierSecret.secretArn],
    }));
  }

  private createApiGateway(): void {
    // API Gateway is now created in the services stack
    // This method is kept for backwards compatibility but does nothing
  }

  private createDashboards(): void {
    this.workshopDashboards = new WorkshopDashboards(this, 'WorkshopDashboards', this.region, this.account);

    // Output dashboard URLs with clean names
    new cdk.CfnOutput(this, 'Module1ObservabilityDashboard', {
      value: `https://${this.region}.console.aws.amazon.com/cloudwatch/home?region=${this.region}#dashboards:name=${CONSTANTS.DASHBOARD_NAMES.OBSERVABILITY}`,
      description: 'Module 1: Observability Dashboard'
    });

    new cdk.CfnOutput(this, 'Module2IdempotencyDashboard', {
      value: `https://${this.region}.console.aws.amazon.com/cloudwatch/home?region=${this.region}#dashboards:name=${CONSTANTS.DASHBOARD_NAMES.IDEMPOTENCY}`,
      description: 'Module 2: Idempotency Dashboard'
    });

    new cdk.CfnOutput(this, 'Module3BatchProcessingDashboard', {
      value: `https://${this.region}.console.aws.amazon.com/cloudwatch/home?region=${this.region}#dashboards:name=${CONSTANTS.DASHBOARD_NAMES.BATCH_PROCESSING}`,
      description: 'Module 3: Batch Processing Dashboard'
    });
  }

  private createExports(): void {
    const exports = [
      { id: 'RidesTableArn', value: this.ridesTable.tableArn, key: EXPORT_KEYS.ridesTableArn },
      { id: 'RidesTableName', value: this.ridesTable.tableName, key: EXPORT_KEYS.ridesTableName },
      { id: 'DriversTableArn', value: this.driversTable.tableArn, key: EXPORT_KEYS.driversTableArn },
      { id: 'DriversTableName', value: this.driversTable.tableName, key: EXPORT_KEYS.driversTableName },
      { id: 'PaymentsTableArn', value: this.paymentsTable.tableArn, key: EXPORT_KEYS.paymentsTableArn },
      { id: 'PaymentsTableName', value: this.paymentsTable.tableName, key: EXPORT_KEYS.paymentsTableName },
      { id: 'PaymentsTableStreamArn', value: this.paymentsTable.tableStreamArn!, key: EXPORT_KEYS.paymentsTableStreamArn },
      { id: 'PricingTableArn', value: this.pricingTable.tableArn, key: EXPORT_KEYS.pricingTableArn },
      { id: 'PricingTableName', value: this.pricingTable.tableName, key: EXPORT_KEYS.pricingTableName },
      { id: 'IdempotencyTableArn', value: this.idempotencyTable.tableArn, key: EXPORT_KEYS.idempotencyTableArn },
      { id: 'IdempotencyTableName', value: this.idempotencyTable.tableName, key: EXPORT_KEYS.idempotencyTableName },
      { id: 'EventBusArn', value: this.eventBus.eventBusArn, key: EXPORT_KEYS.eventBusArn },
      { id: 'EventBusName', value: this.eventBus.eventBusName, key: EXPORT_KEYS.eventBusName },
      { id: 'LambdaExecutionRoleArn', value: this.lambdaExecutionRole.roleArn, key: EXPORT_KEYS.lambdaExecutionRoleArn },
      { id: 'RushHourMultiplierSecretArn', value: this.rushHourMultiplierSecret.secretArn, key: EXPORT_KEYS.rushHourMultiplierSecretArn },
    ];

    exports.forEach(({ id, value, key }) => {
      new cdk.CfnOutput(this, id, { value, exportName: key });
    });
  }
}
