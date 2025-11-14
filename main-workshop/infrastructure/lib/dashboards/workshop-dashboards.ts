import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import { CONSTANTS } from '../constants';

/**
 * Simple CloudWatch Dashboards for the workshop
 * Creates three dashboards: Observability, Idempotency, and Batch Processing
 */
export class WorkshopDashboards extends Construct {
  public readonly observabilityDashboard: cloudwatch.Dashboard;
  public readonly idempotencyDashboard: cloudwatch.Dashboard;
  public readonly batchProcessingDashboard: cloudwatch.Dashboard;

  constructor(scope: Construct, id: string, region: string, accountId: string) {
    super(scope, id);

    // Module 1: Observability Dashboard (Logging, Tracing, Metrics)
    this.observabilityDashboard = new cloudwatch.Dashboard(this, 'ObservabilityDashboard', {
      dashboardName: CONSTANTS.DASHBOARD_NAMES.OBSERVABILITY,
      defaultInterval: cdk.Duration.minutes(30),
    });

    const services = Object.values(CONSTANTS.LAMBDA_FUNCTION_NAMES);
    const rideServiceLogGroup = `/aws/lambda/${CONSTANTS.LAMBDA_FUNCTION_NAMES.RIDE_SERVICE}`;
    const allServiceLogGroups = services.map(fn => `/aws/lambda/${fn}`);

    this.observabilityDashboard.addWidgets(
      new cloudwatch.TextWidget({
        markdown: `# 📊 Module 1: Observability\n\n` +
          `Monitor structured logging, distributed tracing, and custom business metrics.`,
        width: 24,
        height: 2,
      })
    );

    // Device Header Detection Widget
    this.observabilityDashboard.addWidgets(
      new cloudwatch.LogQueryWidget({
        title: '🔍 Device Header Detection (Android Issue Debugging)',
        logGroupNames: [rideServiceLogGroup],
        queryLines: [
          'fields @timestamp, level, x_device_id, ride_id, @message',
          'filter (@message like /Header not found/ or ispresent(level)) and @entity.KeyAttributes.Name = "powertools-ride-workshop-ride-service"',
          'sort @timestamp desc',
          'limit 200',
        ],
        width: 24,
        height: 6,
      })
    );

    // Business Metrics - Real-time KPIs
    this.observabilityDashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: '🚗 Ride Requests & Success Rate',
        left: [
          new cloudwatch.MathExpression({
            expression: 'SUM(SEARCH(\'{PowertoolsRide,Service,PaymentMethod} Service="ride-service" MetricName="RideCreated"\', \'Sum\', 300)) + SUM(SEARCH(\'{PowertoolsRide,service,PaymentMethod} service="ride-service" MetricName="RideCreated"\', \'Sum\', 300)) + SUM(SEARCH(\'{PowertoolsRide,PaymentMethod,service} service="ride-service" MetricName="RideCreated"\', \'Sum\', 300))',
            label: 'Successful Rides',
            color: '#2ca02c',
            period: cdk.Duration.minutes(5),
          }),
          new cloudwatch.MathExpression({
            expression: 'SUM(SEARCH(\'{PowertoolsRide,service} service="ride-service" MetricName="RideCreationError"\', \'Sum\', 300)) + SUM(SEARCH(\'{PowertoolsRide,Service} Service="ride-service" MetricName="RideCreationError"\', \'Sum\', 300)) + SUM(SEARCH(\'{PowertoolsRide,service} service="ride-service" MetricName="RideCreationFailed"\', \'Sum\', 300)) + SUM(SEARCH(\'{PowertoolsRide,Service} Service="ride-service" MetricName="RideCreationFailed"\', \'Sum\', 300))',
            label: 'Failed Rides',
            color: '#d62728',
            period: cdk.Duration.minutes(5),
          }),
        ],
        leftYAxis: {
          label: 'Count',
          showUnits: false,
        },
        width: 12,
        height: 6,
        liveData: true,
      }),
      new cloudwatch.GraphWidget({
        title: '💰 Revenue Metrics',
        left: [
          new cloudwatch.MathExpression({
            expression:
              'SUM(SEARCH(\'{PowertoolsRide,Service,PaymentMethod} Service="payment-processor" MetricName="PaymentSuccess"\', \'Sum\', 300)) + SUM(SEARCH(\'{PowertoolsRide,service,PaymentMethod} service="payment-processor" MetricName="PaymentSuccess"\', \'Sum\', 300))',
            label: 'Successful Payments',
            color: '#2ca02c',
            period: cdk.Duration.minutes(5),
          }),
          new cloudwatch.MathExpression({
            expression:
              'SUM(SEARCH(\'{PowertoolsRide,Service,PaymentMethod} Service="payment-processor" MetricName="PaymentFailed"\', \'Sum\', 300)) + SUM(SEARCH(\'{PowertoolsRide,service,PaymentMethod} service="payment-processor" MetricName="PaymentFailed"\', \'Sum\', 300))',
            label: 'Failed Payments',
            color: '#d62728',
            period: cdk.Duration.minutes(5),
          }),
        ],
        right: [
          new cloudwatch.MathExpression({
            expression:
              'SUM(SEARCH(\'{PowertoolsRide,Service,PaymentMethod} Service="payment-processor" MetricName="PaymentAmount"\', \'Sum\', 300)) + SUM(SEARCH(\'{PowertoolsRide,service,PaymentMethod} service="payment-processor" MetricName="PaymentAmount"\', \'Sum\', 300))',
            label: 'Total Payment Amount',
            color: '#ff7f0e',
            period: cdk.Duration.minutes(5),
          }),
          new cloudwatch.MathExpression({
            expression:
              'SUM(SEARCH(\'{PowertoolsRide,Service} Service="ride-completion-service" MetricName="CompletedRideAmount"\', \'Sum\', 300)) + SUM(SEARCH(\'{PowertoolsRide,service} service="ride-completion-service" MetricName="CompletedRideAmount"\', \'Sum\', 300))',
            label: 'Completed Ride Revenue',
            color: '#9467bd',
            period: cdk.Duration.minutes(5),
          }),
        ],
        leftYAxis: {
          label: 'Count',
          showUnits: false,
        },
        rightYAxis: {
          label: 'Amount ($)',
          showUnits: false,
        },
        width: 12,
        height: 6,
        liveData: true,
      })
    );

    // Payment Processing Performance
    this.observabilityDashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: '⏱️ Payment Processing Duration',
        left: [
          new cloudwatch.Metric({
            namespace: 'AWS/Lambda',
            metricName: 'Duration',
            dimensionsMap: {
              FunctionName: CONSTANTS.LAMBDA_FUNCTION_NAMES.PAYMENT_PROCESSOR,
            },
            statistic: 'Average',
            period: cdk.Duration.minutes(5),
            label: 'Lambda Avg Duration',
            color: '#1f77b4',
          }),
          new cloudwatch.Metric({
            namespace: 'AWS/Lambda',
            metricName: 'Duration',
            dimensionsMap: {
              FunctionName: CONSTANTS.LAMBDA_FUNCTION_NAMES.PAYMENT_PROCESSOR,
            },
            statistic: 'Maximum',
            period: cdk.Duration.minutes(5),
            label: 'Lambda Max Duration',
            color: '#d62728',
          }),
        ],
        right: [
          new cloudwatch.MathExpression({
            expression:
              'AVG(SEARCH(\'{PowertoolsRide,Service,PaymentMethod} Service="payment-processor" MetricName="PaymentProcessingTime"\', \'Average\', 300)) + AVG(SEARCH(\'{PowertoolsRide,service,PaymentMethod} service="payment-processor" MetricName="PaymentProcessingTime"\', \'Average\', 300))',
            label: 'Avg Processing Time',
            color: '#ff7f0e',
            period: cdk.Duration.minutes(5),
          }),
        ],
        leftYAxis: {
          label: 'Lambda Duration (ms)',
          showUnits: false,
        },
        rightYAxis: {
          label: 'Processing Time (ms)',
          showUnits: false,
        },
        width: 12,
        height: 6,
        liveData: true,
      }),
      new cloudwatch.GraphWidget({
        title: '💳 Payments by Method',
        left: [
          new cloudwatch.MathExpression({
            expression:
              'SUM(SEARCH(\'{PowertoolsRide,Service,PaymentMethod} Service="payment-processor" PaymentMethod="credit-card" MetricName="PaymentSuccess"\', \'Sum\', 300)) + SUM(SEARCH(\'{PowertoolsRide,service,PaymentMethod} service="payment-processor" PaymentMethod="credit-card" MetricName="PaymentSuccess"\', \'Sum\', 300))',
            label: 'Credit Card',
            color: '#1f77b4',
            period: cdk.Duration.minutes(5),
          }),
          new cloudwatch.MathExpression({
            expression:
              'SUM(SEARCH(\'{PowertoolsRide,Service,PaymentMethod} Service="payment-processor" PaymentMethod="somecompany-pay" MetricName="PaymentSuccess"\', \'Sum\', 300)) + SUM(SEARCH(\'{PowertoolsRide,service,PaymentMethod} service="payment-processor" PaymentMethod="somecompany-pay" MetricName="PaymentSuccess"\', \'Sum\', 300))',
            label: 'SomeCompany Pay',
            color: '#ff7f0e',
            period: cdk.Duration.minutes(5),
          }),
          new cloudwatch.MathExpression({
            expression:
              'SUM(SEARCH(\'{PowertoolsRide,Service,PaymentMethod} Service="payment-processor" PaymentMethod="cash" MetricName="PaymentSuccess"\', \'Sum\', 300)) + SUM(SEARCH(\'{PowertoolsRide,service,PaymentMethod} service="payment-processor" PaymentMethod="cash" MetricName="PaymentSuccess"\', \'Sum\', 300))',
            label: 'Cash',
            color: '#2ca02c',
            period: cdk.Duration.minutes(5),
          }),
        ],
        leftYAxis: {
          label: 'Successful Payments',
          showUnits: false,
        },
        width: 12,
        height: 6,
        liveData: true,
      })
    );

    // Correlation ID Tracing - End-to-End Journey
    this.observabilityDashboard.addWidgets(
      new cloudwatch.LogQueryWidget({
        title: '🔗 Correlation ID Journey - Complete Request Flow',
        logGroupNames: allServiceLogGroups,
        queryLines: [
          'fields @timestamp, correlation_id, service, @message',
          'filter ispresent(correlation_id)',
          'sort correlation_id, @timestamp',
          'limit 100',
        ],
        width: 24,
        height: 8,
      })
    );

    // Log Optimization - Payment Processor Buffering
    const paymentProcessorLogGroup = `/aws/lambda/${CONSTANTS.LAMBDA_FUNCTION_NAMES.PAYMENT_PROCESSOR}`;
    this.observabilityDashboard.addWidgets(
      new cloudwatch.TextWidget({
        markdown: `## Log Optimization - Payment Processor Buffering\n\n` +
          `Monitor log volume reduction from buffering DEBUG logs on successful payments.`,
        width: 24,
        height: 2,
      })
    );

    this.observabilityDashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: '📊 Payment Processor Log Volume',
        left: [
          new cloudwatch.Metric({
            namespace: 'AWS/Logs',
            metricName: 'IncomingLogEvents',
            dimensionsMap: { LogGroupName: paymentProcessorLogGroup },
            statistic: 'Sum',
            period: cdk.Duration.minutes(5),
            label: 'Log Events Count',
            color: '#1f77b4',
          }),
        ],
        right: [
          new cloudwatch.Metric({
            namespace: 'AWS/Logs',
            metricName: 'IncomingBytes',
            dimensionsMap: { LogGroupName: paymentProcessorLogGroup },
            statistic: 'Sum',
            period: cdk.Duration.minutes(5),
            label: 'Log Data Volume',
            color: '#ff7f0e',
          }),
        ],
        leftYAxis: {
          label: 'Log Events',
          showUnits: false,
        },
        rightYAxis: {
          label: 'Bytes',
          showUnits: false,
        },
        width: 12,
        height: 6,
        liveData: true,
      }),
      new cloudwatch.LogQueryWidget({
        title: '📈 Payment Processor Log Level Distribution',
        logGroupNames: [paymentProcessorLogGroup],
        queryLines: [
          'fields @timestamp, level',
          'filter ispresent(level)',
          'filter @message not like "Payment created" #this filters logs from module 2',
          'stats count() as LogCount by level',
          'sort LogCount desc',
        ],
        width: 12,
        height: 6,
      })
    );

    // Parameters - Configuration Management
    this.observabilityDashboard.addWidgets(
      new cloudwatch.TextWidget({
        markdown: `## Parameters - Configuration Management\n\n` +
          `Monitor parameter caching performance in Dynamic Pricing Service.`,
        width: 24,
        height: 2,
      })
    );

    this.observabilityDashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: '⚡ Dynamic Pricing Service Performance',
        left: [
          new cloudwatch.Metric({
            namespace: 'AWS/Lambda',
            metricName: 'Duration',
            dimensionsMap: { FunctionName: CONSTANTS.LAMBDA_FUNCTION_NAMES.DYNAMIC_PRICING_SERVICE },
            statistic: 'p95',
            period: cdk.Duration.minutes(5),
            label: 'P95 Duration',
            color: '#1f77b4',
          }),
          new cloudwatch.Metric({
            namespace: 'AWS/Lambda',
            metricName: 'Duration',
            dimensionsMap: { FunctionName: CONSTANTS.LAMBDA_FUNCTION_NAMES.DYNAMIC_PRICING_SERVICE },
            statistic: 'p99',
            period: cdk.Duration.minutes(5),
            label: 'P99 Duration',
            color: '#d62728',
          }),
        ],
        leftYAxis: {
          label: 'Duration (ms)',
          showUnits: false,
        },
        width: 24,
        height: 6,
        liveData: true,
      })
    );

    // Module 2: Idempotency Dashboard
    this.idempotencyDashboard = new cloudwatch.Dashboard(this, 'IdempotencyDashboard', {
      dashboardName: CONSTANTS.DASHBOARD_NAMES.IDEMPOTENCY,
      defaultInterval: cdk.Duration.minutes(30),
    });

    this.idempotencyDashboard.addWidgets(
      new cloudwatch.TextWidget({
        markdown: `# 🔒 Module 2: Idempotency\n\n` +
          `Monitor duplicate event detection and payload validation`,
        width: 24,
        height: 2,
      })
    );

    // Payment Processing Overview - Key Metrics
    const paymentFn = CONSTANTS.LAMBDA_FUNCTION_NAMES.PAYMENT_PROCESSOR;

    // Detection Queries - Find Duplicate Payments
    this.idempotencyDashboard.addWidgets(
      new cloudwatch.LogQueryWidget({
        title: '⚠️ DUPLICATE PAYMENTS (based on ride_id)',
        logGroupNames: [`/aws/lambda/${paymentFn}`],
        queryLines: [
          'fields ride_id, payment_id',
          'filter message like "Payment created"',
          'stats count_distinct(payment_id) as duplicate_payments by bin(30s)',
          'filter duplicate_payments > 1',
          'sort duplicate_payments desc',
        ],
        view: cloudwatch.LogQueryVisualizationType.LINE,
        width: 12,
        height: 8,
      }),
      new cloudwatch.LogQueryWidget({
        title: '✅ All Payments Created',
        logGroupNames: [`/aws/lambda/${paymentFn}`],
        queryLines: [
          'fields @timestamp, ride_id, payment_id, payment_amount, payment_method',
          'filter message like "Payment created"',
          'sort ride_id, @timestamp desc',
          'limit 100',
        ],
        width: 12,
        height: 8,
      })
    );

    // Payload Validation Exceptions Counter
    this.idempotencyDashboard.addWidgets(
      new cloudwatch.SingleValueWidget({
        title: '⚠️ PAYLOAD VALIDATION EXCEPTIONS - Price Mismatches Detected',
        metrics: [
          new cloudwatch.Metric({
            namespace: 'AWS/Lambda',
            metricName: 'Errors',
            dimensionsMap: { FunctionName: paymentFn },
            statistic: 'Sum',
            period: cdk.Duration.minutes(5),
            label: 'Validation Exceptions',
            color: '#d62728',
          }),
        ],
        width: 12,
        height: 6,
        setPeriodToTimeRange: true,
      }),
      new cloudwatch.LogQueryWidget({
        title: '📋 Recent Validation Exception Details',
        logGroupNames: [`/aws/lambda/${paymentFn}`],
        queryLines: [
          'fields @timestamp, @message',
          'filter (@message like /IdempotencyValidationException/ or @message like /IdempotencyValidationError/)',
          'sort @timestamp desc',
          'limit 100',
        ],
        width: 12,
        height: 6,
      })
    );

    // Response Hooks - Cache Hit Metrics
    this.idempotencyDashboard.addWidgets(
      new cloudwatch.SingleValueWidget({
        title: '🎯 Cache Hits - Response Hook Executions',
        metrics: [
          new cloudwatch.MathExpression({
            expression: 'SUM(SEARCH(\'{PowertoolsRide,Service} MetricName="PaymentIdempotentHits" Service="payment-processor"\', \'Sum\', 300)) + SUM(SEARCH(\'{PowertoolsRide,service} MetricName="PaymentIdempotentHits" service="payment-processor"\', \'Sum\', 300))',
            label: 'Total Cache Hits',
            color: '#2ca02c',
            period: cdk.Duration.minutes(5),
          }),
        ],
        width: 12,
        height: 6,
        setPeriodToTimeRange: true,
      }),
      new cloudwatch.LogQueryWidget({
        title: '🎣 Response Hook Execution Logs - Cached Responses with Metadata',
        logGroupNames: [`/aws/lambda/${paymentFn}`],
        queryLines: [
          'fields @timestamp, cache_expiration, ride_id, rider_id, payment_id, correlation_id',
          'filter @message like /Log from hook/',
          'sort @timestamp desc',
          'limit 50',
        ],
        width: 12,
        height: 6,
      })
    );

    this.batchProcessingDashboard = new cloudwatch.Dashboard(this, 'BatchProcessingDashboard', {
      dashboardName: CONSTANTS.DASHBOARD_NAMES.BATCH_PROCESSING,
      defaultInterval: cdk.Duration.minutes(30),
    });

    const streamFn = CONSTANTS.LAMBDA_FUNCTION_NAMES.PAYMENT_STREAM_PROCESSOR;
    const streamLogGroup = `/aws/lambda/${streamFn}`;

    this.batchProcessingDashboard.addWidgets(
      new cloudwatch.TextWidget({
        markdown: `# 📦 Module 3: Batch Processing`,
        width: 24,
        height: 1,
      })
    );

    // Key Problem Indicators
    this.batchProcessingDashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: '🔥 Lambda Errors',
        left: [
          new cloudwatch.Metric({
            namespace: 'AWS/Lambda',
            metricName: 'Errors',
            dimensionsMap: { FunctionName: streamFn },
            statistic: 'Sum',
            period: cdk.Duration.minutes(1),
            label: 'Function Errors',
            color: '#d62728',
          }),
        ],
        right: [
          new cloudwatch.Metric({
            namespace: 'AWS/Lambda',
            metricName: 'Invocations',
            dimensionsMap: { FunctionName: streamFn },
            statistic: 'Sum',
            period: cdk.Duration.minutes(1),
            label: 'Total Invocations',
            color: '#1f77b4',
          }),
        ],
        leftYAxis: {
          label: 'Errors',
          showUnits: false,
        },
        rightYAxis: {
          label: 'Invocations',
          showUnits: false,
        },
        width: 8,
        height: 6,
        liveData: true,
      }),
      new cloudwatch.GraphWidget({
        title: '📊 Batch Success vs Failure Rate',
        left: [
          new cloudwatch.MathExpression({
            expression: 'success / (success + errors) * 100',
            usingMetrics: {
              success: new cloudwatch.Metric({
                namespace: 'AWS/Lambda',
                metricName: 'Invocations',
                dimensionsMap: { FunctionName: streamFn },
                statistic: 'Sum',
                period: cdk.Duration.minutes(5),
              }),
              errors: new cloudwatch.Metric({
                namespace: 'AWS/Lambda',
                metricName: 'Errors',
                dimensionsMap: { FunctionName: streamFn },
                statistic: 'Sum',
                period: cdk.Duration.minutes(5),
              }),
            },
            label: 'Success Rate (%)',
            color: '#2ca02c',
            period: cdk.Duration.minutes(5),
          }),
        ],
        leftYAxis: {
          label: 'Success Rate (%)',
          showUnits: false,
          min: 0,
          max: 100,
        },
        width: 8,
        height: 6,
        liveData: true,
      }),
      new cloudwatch.SingleValueWidget({
        title: '💥 Total Failed Batches',
        metrics: [
          new cloudwatch.Metric({
            namespace: 'AWS/Lambda',
            metricName: 'Errors',
            dimensionsMap: { FunctionName: streamFn },
            statistic: 'Sum',
            period: cdk.Duration.hours(1),
            label: 'Failed Invocations',
            color: '#d62728',
          }),
        ],
        width: 8,
        height: 6,
        setPeriodToTimeRange: true,
      })
    );

    this.batchProcessingDashboard.addWidgets(
      new cloudwatch.SingleValueWidget({
        title: '⚡ Average Batch Completion Time',
        metrics: [
          new cloudwatch.Metric({
            namespace: 'AWS/Lambda',
            metricName: 'Duration',
            dimensionsMap: { FunctionName: streamFn },
            statistic: 'Average',
            period: cdk.Duration.minutes(5),
            label: 'Avg Duration (ms)',
            color: '#1f77b4',
          }),
        ],
        width: 8,
        height: 6,
        setPeriodToTimeRange: true,
      }),
      new cloudwatch.GraphWidget({
        title: '📈 Processing Rate - Records per Minute',
        left: [
          new cloudwatch.MathExpression({
            expression: '(SUM(SEARCH(\'{PowertoolsRide,service} MetricName="SuccessfulRecords" service="payment-stream-processor"\', \'Sum\', 60)) + SUM(SEARCH(\'{PowertoolsRide,Service} MetricName="SuccessfulRecords" Service="payment-stream-processor"\', \'Sum\', 60)))',
            label: 'Successful Records/Min',
            color: '#2ca02c',
            period: cdk.Duration.minutes(1),
          }),
        ],
        right: [
          new cloudwatch.MathExpression({
            expression: '(SUM(SEARCH(\'{PowertoolsRide,service} MetricName="BatchSize" service="payment-stream-processor"\', \'Sum\', 60)) + SUM(SEARCH(\'{PowertoolsRide,Service} MetricName="BatchSize" Service="payment-stream-processor"\', \'Sum\', 60)))',
            label: 'Total Records/Min',
            color: '#1f77b4',
            period: cdk.Duration.minutes(1),
          }),
        ],
        leftYAxis: {
          label: 'Successful Records/Min',
          showUnits: false,
        },
        rightYAxis: {
          label: 'Total Records/Min',
          showUnits: false,
        },
        width: 16,
        height: 6,
        liveData: true,
      })
    );

    this.batchProcessingDashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: '⏱️ Lambda Duration',
        left: [
          new cloudwatch.Metric({
            namespace: 'AWS/Lambda',
            metricName: 'Duration',
            dimensionsMap: { FunctionName: streamFn },
            statistic: 'Average',
            period: cdk.Duration.minutes(1),
            label: 'Avg Duration',
            color: '#1f77b4',
          }),
          new cloudwatch.Metric({
            namespace: 'AWS/Lambda',
            metricName: 'Duration',
            dimensionsMap: { FunctionName: streamFn },
            statistic: 'p99',
            period: cdk.Duration.minutes(1),
            label: 'P99 Duration',
            color: '#ff7f0e',
          }),
        ],
        leftYAxis: {
          label: 'Duration (ms)',
          showUnits: false,
        },
        width: 12,
        height: 6,
        liveData: true,
      }),
      new cloudwatch.GraphWidget({
        title: '📊 Batch Processing Metrics',
        left: [
          new cloudwatch.MathExpression({
            expression: 'SUM(SEARCH(\'{PowertoolsRide,service} MetricName="BatchSize" service="payment-stream-processor"\', \'Sum\', 60)) + SUM(SEARCH(\'{PowertoolsRide,Service} MetricName="BatchSize" Service="payment-stream-processor"\', \'Sum\', 60))',
            label: 'Batch Size',
            color: '#1f77b4',
            period: cdk.Duration.minutes(1),
          }),
          new cloudwatch.MathExpression({
            expression: 'SUM(SEARCH(\'{PowertoolsRide,service} MetricName="SuccessfulRecords" service="payment-stream-processor"\', \'Sum\', 60)) + SUM(SEARCH(\'{PowertoolsRide,Service} MetricName="SuccessfulRecords" Service="payment-stream-processor"\', \'Sum\', 60))',
            label: 'Successful Records',
            color: '#2ca02c',
            period: cdk.Duration.minutes(1),
          }),
          new cloudwatch.MathExpression({
            expression: 'SUM(SEARCH(\'{PowertoolsRide,service} MetricName="FailedRecords" service="payment-stream-processor"\', \'Sum\', 60)) + SUM(SEARCH(\'{PowertoolsRide,Service} MetricName="FailedRecords" Service="payment-stream-processor"\', \'Sum\', 60))',
            label: 'Failed Records',
            color: '#d62728',
            period: cdk.Duration.minutes(1),
          }),
        ],
        leftYAxis: {
          label: 'Count',
          showUnits: false,
        },
        width: 12,
        height: 6,
        liveData: true,
      })
    );

    this.batchProcessingDashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: '📥 Extracted Records',
        left: [
          new cloudwatch.MathExpression({
            expression: 'SUM(SEARCH(\'{PowertoolsRide,service} MetricName="ExtractedRecords" service="payment-stream-processor"\', \'Sum\', 60)) + SUM(SEARCH(\'{PowertoolsRide,Service} MetricName="ExtractedRecords" Service="payment-stream-processor"\', \'Sum\', 60))',
            label: 'Extracted Records',
            color: '#9467bd',
            period: cdk.Duration.minutes(1),
          }),
        ],
        leftYAxis: {
          label: 'Count',
          showUnits: false,
        },
        width: 24,
        height: 6,
        liveData: true,
      })
    );

  }
}
