import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambdaEventSources from 'aws-cdk-lib/aws-lambda-event-sources';
import { getServiceConfig } from './config/service-config';
import { EXPORT_KEYS, InfrastructureReferences } from './config/stack-config';
import { CONSTANTS } from './constants';

export interface RiderWorkshopServicesStackProps extends cdk.StackProps {
  language: string;
}

export class RiderWorkshopServicesStack extends cdk.Stack {
  public readonly services: {
    rideService: lambda.Function;
    driverMatchingService: lambda.Function;
    dynamicPricingService: lambda.Function;
    paymentProcessor: lambda.Function;
    paymentStreamProcessor: lambda.Function;
    rideCompletionService: lambda.Function;
  };

  private infrastructureRefs: InfrastructureReferences;

  constructor(scope: Construct, id: string, props: RiderWorkshopServicesStackProps) {
    super(scope, id, props);

    this.infrastructureRefs = this.importInfrastructure();
    const serviceConfigs = getServiceConfig(props.language);

    this.services = this.createServices(serviceConfigs);
    this.addApiGatewayMethods();
    this.createEventBridgeRules();
    this.addStreamEventSources();
    this.grantPermissions();
  }

  private importInfrastructure(): InfrastructureReferences {
    return {
      tables: {
        rides: {
          arn: cdk.Fn.importValue(EXPORT_KEYS.ridesTableArn),
          name: cdk.Fn.importValue(EXPORT_KEYS.ridesTableName),
        },
        drivers: {
          arn: cdk.Fn.importValue(EXPORT_KEYS.driversTableArn),
          name: cdk.Fn.importValue(EXPORT_KEYS.driversTableName),
        },
        payments: {
          arn: cdk.Fn.importValue(EXPORT_KEYS.paymentsTableArn),
          name: cdk.Fn.importValue(EXPORT_KEYS.paymentsTableName),
          streamArn: cdk.Fn.importValue(EXPORT_KEYS.paymentsTableStreamArn),
        },
        pricing: {
          arn: cdk.Fn.importValue(EXPORT_KEYS.pricingTableArn),
          name: cdk.Fn.importValue(EXPORT_KEYS.pricingTableName),
        },
        idempotency: {
          arn: cdk.Fn.importValue(EXPORT_KEYS.idempotencyTableArn),
          name: cdk.Fn.importValue(EXPORT_KEYS.idempotencyTableName),
        },
      },
      eventBus: {
        arn: cdk.Fn.importValue(EXPORT_KEYS.eventBusArn),
        name: cdk.Fn.importValue(EXPORT_KEYS.eventBusName),
      },
      executionRole: {
        arn: cdk.Fn.importValue(EXPORT_KEYS.lambdaExecutionRoleArn),
      },
      rushHourMultiplierSecretArn: cdk.Fn.importValue(EXPORT_KEYS.rushHourMultiplierSecretArn),
    };
  }

  private createLambda(id: string, serviceName: string, config: any): lambda.Function {
    const logGroup = new logs.LogGroup(this, `${id}LogGroup`, {
      logGroupName: `/aws/lambda/powertools-ride-workshop-${serviceName}`,
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const powertoolsPythonLayer = `arn:aws:lambda:${this.region}:017000801446:layer:AWSLambdaPowertoolsPythonV3-python312-x86_64:24`;

    const layers: lambda.ILayerVersion[] = [];
    if (config.runtime === lambda.Runtime.PYTHON_3_12) {
      layers.push(lambda.LayerVersion.fromLayerVersionArn(this, `${id}PowertoolsLayer`, powertoolsPythonLayer));
    }

    return new lambda.Function(this, id, {
      functionName: `powertools-ride-workshop-${serviceName}`,
      runtime: config.runtime,
      handler: config.handler,
      code: lambda.Code.fromAsset(config.assetPath),
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      role: iam.Role.fromRoleArn(this, `${id}Role`, this.infrastructureRefs.executionRole.arn),
      logGroup,
      layers: layers.length > 0 ? layers : undefined,
      tracing: lambda.Tracing.ACTIVE,
      environment: {
        POWERTOOLS_SERVICE_NAME: serviceName,
        POWERTOOLS_METRICS_NAMESPACE: "PowertoolsRide",
        POWERTOOLS_BATCH_THROW_ON_FULL_BATCH_FAILURE: 'false',
        RIDES_TABLE_NAME: this.infrastructureRefs.tables.rides.name,
        DRIVERS_TABLE_NAME: this.infrastructureRefs.tables.drivers.name,
        PAYMENTS_TABLE_NAME: this.infrastructureRefs.tables.payments.name,
        PRICING_TABLE_NAME: this.infrastructureRefs.tables.pricing.name,
        IDEMPOTENCY_TABLE_NAME: this.infrastructureRefs.tables.idempotency.name,
        EVENT_BUS_NAME: this.infrastructureRefs.eventBus.name,
        RUSH_HOUR_MULTIPLIER_SECRET_NAME: CONSTANTS.SECRETS.RUSH_HOUR_MULTIPLIER,
        AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
        LANGUAGE: config.language.toUpperCase(),
        NODE_OPTIONS: "--enable-source-maps"
      },
    });
  }

  private createServices(serviceConfigs: any) {
    const serviceDefinitions = [
      { id: 'RideService', name: CONSTANTS.SERVICE_NAMES.RIDE_SERVICE, config: serviceConfigs.rideService },
      { id: 'DriverMatchingService', name: CONSTANTS.SERVICE_NAMES.DRIVER_MATCHING_SERVICE, config: serviceConfigs.driverMatchingService },
      { id: 'DynamicPricingService', name: CONSTANTS.SERVICE_NAMES.DYNAMIC_PRICING_SERVICE, config: serviceConfigs.dynamicPricingService },
      { id: 'PaymentProcessor', name: CONSTANTS.SERVICE_NAMES.PAYMENT_PROCESSOR, config: serviceConfigs.paymentProcessor },
      { id: 'PaymentStreamProcessor', name: CONSTANTS.SERVICE_NAMES.PAYMENT_STREAM_PROCESSOR, config: serviceConfigs.paymentStreamProcessor },
      { id: 'RideCompletionService', name: CONSTANTS.SERVICE_NAMES.RIDE_COMPLETION_SERVICE, config: serviceConfigs.rideCompletionService },
    ];

    const services = serviceDefinitions.reduce((acc, { id, name, config }) => {
      acc[id.charAt(0).toLowerCase() + id.slice(1)] = this.createLambda(id, name, config);
      return acc;
    }, {} as any);

    services.rideService.addToRolePolicy(new iam.PolicyStatement({
      actions: ['iam:PassRole'],
      resources: [this.infrastructureRefs.executionRole.arn],
    }));

    return services;
  }

  private addApiGatewayMethods(): void {
    // Create API Gateway in this stack
    const rideServiceApi = new apigateway.RestApi(this, 'RideServiceApi', {
      restApiName: CONSTANTS.API_GATEWAY.NAME,
      description: CONSTANTS.API_GATEWAY.DESCRIPTION,
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'X-Amz-Date', 'Authorization', 'X-Api-Key', 'x-correlation-id'],
      },
      deployOptions: {
        tracingEnabled: true,
        stageName: 'prod',
      },
    });

    // Create /rides resource and add methods
    const ridesResource = rideServiceApi.root.addResource('rides');
    const integration = new apigateway.LambdaIntegration(this.services.rideService);

    ridesResource.addMethod('POST', integration);
    ridesResource.addMethod('GET', integration);
    const rideIdResource = ridesResource.addResource('{rideId}');
    rideIdResource.addMethod('GET', integration);

    // Export API URL for load generator stack
    new cdk.CfnOutput(this, 'RideServiceApiURL', {
      value: rideServiceApi.url,
      exportName: EXPORT_KEYS.rideServiceApiUrl,
      description: 'Ride Service API URL',
    });
  }

  private createEventBridgeRules(): void {
    const eventBus = events.EventBus.fromEventBusArn(this, 'ImportedEventBus', this.infrastructureRefs.eventBus.arn);

    const rules = [
      { id: 'RideCreatedRule', source: 'ride-service', detailType: 'RideCreated', target: this.services.dynamicPricingService },
      { id: 'PriceCalculatedRule', source: 'dynamic-pricing-service', detailType: 'PriceCalculated', target: this.services.driverMatchingService },
      { id: 'DriverAssignedRule', source: 'driver-matching-service', detailType: 'DriverAssigned', target: this.services.paymentProcessor },
      { id: 'PaymentCompletedRule', source: 'payment-processor', detailType: 'PaymentCompleted', target: this.services.rideCompletionService },
      { id: 'PaymentFailedRule', source: 'payment-processor', detailType: 'PaymentFailed', target: this.services.rideCompletionService },
      { id: 'StreamPaymentCompletedRule', source: 'payment-stream-processor', detailType: 'PaymentCompleted', target: this.services.rideCompletionService },
    ];

    rules.forEach(({ id, source, detailType, target }) => {
      new events.Rule(this, id, {
        eventBus,
        eventPattern: { source: [source], detailType: [detailType] },
        targets: [new targets.LambdaFunction(target)],
      });
    });
  }

  private addStreamEventSources(): void {
    const paymentsTable = dynamodb.Table.fromTableAttributes(this, 'PaymentsTableForStream', {
      tableArn: this.infrastructureRefs.tables.payments.arn,
      tableStreamArn: this.infrastructureRefs.tables.payments.streamArn,
    });

    this.services.paymentStreamProcessor.addEventSource(new lambdaEventSources.DynamoEventSource(paymentsTable, {
      startingPosition: lambda.StartingPosition.LATEST,
      batchSize: 10,
      retryAttempts: 3,
      maxBatchingWindow: cdk.Duration.seconds(40),
      reportBatchItemFailures: true,
      metricsConfig: {
        metrics: [lambda.MetricType.EVENT_COUNT],
      },
      filters: [
        lambda.FilterCriteria.filter({
          eventName: lambda.FilterRule.isEqual('MODIFY')
        })
      ],
    }));
  }

  private grantPermissions(): void {
    const eventBus = events.EventBus.fromEventBusArn(this, 'EventBusForPermissions', this.infrastructureRefs.eventBus.arn);
    Object.values(this.services).forEach(service => eventBus.grantPutEventsTo(service));

    const tables = {
      rides: dynamodb.Table.fromTableArn(this, 'ImportedRidesTable', this.infrastructureRefs.tables.rides.arn),
      drivers: dynamodb.Table.fromTableArn(this, 'ImportedDriversTable', this.infrastructureRefs.tables.drivers.arn),
      payments: dynamodb.Table.fromTableArn(this, 'ImportedPaymentsTable', this.infrastructureRefs.tables.payments.arn),
      pricing: dynamodb.Table.fromTableArn(this, 'ImportedPricingTable', this.infrastructureRefs.tables.pricing.arn),
    };

    tables.rides.grantReadWriteData(this.services.rideService);
    tables.rides.grantReadData(this.services.driverMatchingService);
    tables.rides.grantReadData(this.services.rideCompletionService);
    tables.drivers.grantReadWriteData(this.services.driverMatchingService);
    tables.drivers.grantReadData(this.services.rideCompletionService);
    tables.payments.grantReadWriteData(this.services.paymentProcessor);
    tables.payments.grantReadData(this.services.paymentStreamProcessor);
    tables.pricing.grantReadWriteData(this.services.dynamicPricingService);
    tables.pricing.grantReadData(this.services.rideService);
  }
}
