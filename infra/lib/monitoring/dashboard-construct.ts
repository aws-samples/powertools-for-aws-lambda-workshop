import { Duration, Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {
  Dashboard,
  Row,
  Metric,
  GraphWidget,
  GraphWidgetView,
  LegendPosition,
  TextWidget,
  Stats,
  MathExpression,
} from 'aws-cdk-lib/aws-cloudwatch';
import { environment } from '../constants.js';

interface DashboardConstructProps extends StackProps {
  tableName: string;
  functionName: string;
  deadLetterQueueName: string;
}

export class DashboardConstruct extends Construct {
  public readonly dashboard: Dashboard;

  public constructor(
    scope: Construct,
    id: string,
    props: DashboardConstructProps
  ) {
    super(scope, id);

    const { functionName, tableName, deadLetterQueueName } = props;

    const lambdaMetricsHeader = [
      new TextWidget({
        markdown: '## AWS Lambda Metrics',
        width: 24,
        height: 1,
      }),
    ];
    const lambdaMetrics = [
      new Row(
        new GraphWidget({
          width: 6,
          height: 6,
          legendPosition: LegendPosition.BOTTOM,
          period: Duration.minutes(1),
          view: GraphWidgetView.TIME_SERIES,
          stacked: false,
          left: [
            new Metric({
              namespace: 'AWS/Lambda',
              metricName: `ConcurrentExecutions`,
              dimensionsMap: {
                FunctionName: functionName,
              },
              statistic: Stats.MAXIMUM,
              period: Duration.minutes(1),
              region: Stack.of(this).region,
            }),
          ],
          title: 'Lambda - ConcurrentExecutions',
          region: Stack.of(this).region,
        }),
        new GraphWidget({
          width: 6,
          height: 6,
          legendPosition: LegendPosition.BOTTOM,
          period: Duration.minutes(1),
          view: GraphWidgetView.TIME_SERIES,
          stacked: false,
          left: [
            new Metric({
              namespace: 'AWS/Lambda',
              metricName: `Duration`,
              dimensionsMap: {
                FunctionName: functionName,
              },
              statistic: Stats.AVERAGE,
              period: Duration.minutes(1),
              region: Stack.of(this).region,
            }),
          ],
          title: 'Lambda - Duration',
          region: Stack.of(this).region,
        }),
        new GraphWidget({
          width: 8,
          height: 6,
          legendPosition: LegendPosition.BOTTOM,
          period: Duration.minutes(1),
          view: GraphWidgetView.TIME_SERIES,
          stacked: false,
          left: [
            new Metric({
              namespace: 'AWS/Lambda',
              metricName: `Errors`,
              dimensionsMap: {
                FunctionName: functionName,
              },
              statistic: Stats.SUM,
              period: Duration.minutes(1),
              label: 'Duration',
              region: Stack.of(this).region,
            }),
          ],
          title: 'Lambda - Errors',
          region: Stack.of(this).region,
        })
      ),
      new Row(
        new GraphWidget({
          width: 6,
          height: 6,
          legendPosition: LegendPosition.BOTTOM,
          period: Duration.minutes(1),
          view: GraphWidgetView.TIME_SERIES,
          stacked: false,
          left: [
            new Metric({
              namespace: 'AWS/Lambda',
              metricName: `Invocations`,
              dimensionsMap: {
                FunctionName: functionName,
              },
              statistic: Stats.SUM,
              period: Duration.minutes(1),
              region: Stack.of(this).region,
            }),
          ],
          title: 'Lambda - Invocations',
          region: Stack.of(this).region,
        }),
        new GraphWidget({
          width: 8,
          height: 6,
          legendPosition: LegendPosition.BOTTOM,
          period: Duration.minutes(1),
          view: GraphWidgetView.TIME_SERIES,
          stacked: false,
          left: [
            new Metric({
              namespace: 'AWS/Lambda',
              metricName: `Throttles`,
              dimensionsMap: {
                FunctionName: functionName,
              },
              statistic: Stats.SUM,
              period: Duration.minutes(1),
              region: Stack.of(this).region,
            }),
          ],
          title: 'Lambda - Throttles',
          region: Stack.of(this).region,
        }),
        new GraphWidget({
          width: 6,
          height: 6,
          legendPosition: LegendPosition.BOTTOM,
          period: Duration.minutes(1),
          view: GraphWidgetView.TIME_SERIES,
          stacked: false,
          left: [
            new Metric({
              namespace: 'AWS/Lambda',
              metricName: `IteratorAge`,
              dimensionsMap: {
                FunctionName: functionName,
              },
              statistic: Stats.AVERAGE,
              period: Duration.minutes(1),
              label: 'Duration',
              region: Stack.of(this).region,
            }),
          ],
          title: 'Lambda - IteratorAge',
          region: Stack.of(this).region,
        })
      ),
      new GraphWidget({
        width: 8,
        height: 6,
        legendPosition: LegendPosition.BOTTOM,
        period: Duration.minutes(1),
        view: GraphWidgetView.TIME_SERIES,
        stacked: false,
        left: [
          new Metric({
            namespace: 'AWS/Lambda',
            metricName: `DeadLetterErrors`,
            dimensionsMap: {
              FunctionName: functionName,
            },
            statistic: Stats.SUM,
            period: Duration.minutes(1),
            label: 'Duration',
            region: Stack.of(this).region,
          }),
        ],
        title: 'Lambda - DeadLetterErrors',
        region: Stack.of(this).region,
      }),
    ];

    const dynamoDBMetricsHeader = [
      new TextWidget({
        markdown: '## Amazon DynamoDB Metrics',
        width: 24,
        height: 1,
      }),
    ];
    const dynamoDBMetrics = [
      new Row(
        new GraphWidget({
          width: 6,
          height: 6,
          legendPosition: LegendPosition.BOTTOM,
          period: Duration.minutes(1),
          view: GraphWidgetView.TIME_SERIES,
          stacked: false,
          leftYAxis: {
            showUnits: false,
          },
          statistic: Stats.AVERAGE,
          left: [
            new Metric({
              namespace: 'AWS/DynamoDB',
              metricName: `ProvisionedReadCapacityUnits`,
              dimensionsMap: {
                TableName: tableName,
              },
              label: 'Provisioned',
              color: '#E02020',
              region: Stack.of(this).region,
            }),
            new MathExpression({
              expression: 'm1/PERIOD(m1)',
              usingMetrics: {
                m1: new Metric({
                  namespace: 'AWS/DynamoDB',
                  metricName: `ConsumedReadCapacityUnits`,
                  dimensionsMap: {
                    TableName: tableName,
                  },
                  statistic: Stats.SUM,
                  region: Stack.of(this).region,
                }),
              },
              label: 'Consumed',
              color: '#0073BB',
            }),
          ],
          title: 'DynamoDB - Read usage (average units/second)',
          region: Stack.of(this).region,
        }),
        new GraphWidget({
          width: 6,
          height: 6,
          legendPosition: LegendPosition.BOTTOM,
          period: Duration.minutes(1),
          view: GraphWidgetView.TIME_SERIES,
          stacked: false,
          leftYAxis: {
            showUnits: false,
          },
          statistic: Stats.SUM,
          left: [
            new Metric({
              namespace: 'AWS/DynamoDB',
              metricName: `ThrottledRequests`,
              dimensionsMap: {
                TableName: tableName,
                Operation: 'GetItem',
              },
              color: '#0073BB',
              region: Stack.of(this).region,
            }),
            new Metric({
              namespace: 'AWS/DynamoDB',
              metricName: `ThrottledRequests`,
              dimensionsMap: {
                TableName: tableName,
                Operation: 'Scan',
              },
              color: '#FF7F0F',
              region: Stack.of(this).region,
            }),
            new Metric({
              namespace: 'AWS/DynamoDB',
              metricName: `ThrottledRequests`,
              dimensionsMap: {
                TableName: tableName,
                Operation: 'Query',
              },
              color: '#2DA02D',
              region: Stack.of(this).region,
            }),
            new Metric({
              namespace: 'AWS/DynamoDB',
              metricName: `ThrottledRequests`,
              dimensionsMap: {
                TableName: tableName,
                Operation: 'BatchGetItem',
              },
              color: '#9468BD',
              region: Stack.of(this).region,
            }),
          ],
          title: 'DynamoDB - Read throttled requests (count)',
          region: Stack.of(this).region,
        }),
        new GraphWidget({
          width: 6,
          height: 6,
          legendPosition: LegendPosition.BOTTOM,
          period: Duration.minutes(1),
          view: GraphWidgetView.TIME_SERIES,
          stacked: false,
          leftYAxis: {
            showUnits: false,
          },
          statistic: Stats.SUM,
          left: [
            new Metric({
              namespace: 'AWS/DynamoDB',
              metricName: `ThrottledRequests`,
              dimensionsMap: {
                TableName: tableName,
                Operation: 'PutItem',
              },
              color: '#0073BB',
              region: Stack.of(this).region,
            }),
            new Metric({
              namespace: 'AWS/DynamoDB',
              metricName: `ThrottledRequests`,
              dimensionsMap: {
                TableName: tableName,
                Operation: 'UpdateItem',
              },
              color: '#FF7F0F',
              region: Stack.of(this).region,
            }),
            new Metric({
              namespace: 'AWS/DynamoDB',
              metricName: `ThrottledRequests`,
              dimensionsMap: {
                TableName: tableName,
                Operation: 'DeleteItem',
              },
              color: '#2DA02D',
              region: Stack.of(this).region,
            }),
            new Metric({
              namespace: 'AWS/DynamoDB',
              metricName: `ThrottledRequests`,
              dimensionsMap: {
                TableName: tableName,
                Operation: 'BatchWriteItem',
              },
              color: '#9468BD',
              region: Stack.of(this).region,
            }),
          ],
          title: 'DynamoDB - Write throttled requests (count)',
          region: Stack.of(this).region,
        })
      ),
      new Row(
        new GraphWidget({
          width: 6,
          height: 6,
          legendPosition: LegendPosition.BOTTOM,
          period: Duration.minutes(1),
          view: GraphWidgetView.TIME_SERIES,
          stacked: false,
          leftYAxis: {
            showUnits: false,
          },
          statistic: Stats.AVERAGE,
          left: [
            new Metric({
              namespace: 'AWS/DynamoDB',
              metricName: `ProvisionedWriteCapacityUnits`,
              dimensionsMap: {
                TableName: tableName,
              },
              label: 'Provisioned',
              color: '#E02020',
              region: Stack.of(this).region,
            }),
            new MathExpression({
              expression: 'm1/PERIOD(m1)',
              usingMetrics: {
                m1: new Metric({
                  namespace: 'AWS/DynamoDB',
                  metricName: `ConsumedWriteCapacityUnits`,
                  dimensionsMap: {
                    TableName: tableName,
                  },
                  statistic: Stats.SUM,
                  region: Stack.of(this).region,
                }),
              },
              label: 'Consumed',
              color: '#0073BB',
            }),
          ],
          title: 'DynamoDB - Write usage (average units/second)',
          region: Stack.of(this).region,
        }),
        new GraphWidget({
          width: 6,
          height: 6,
          legendPosition: LegendPosition.BOTTOM,
          period: Duration.minutes(1),
          view: GraphWidgetView.TIME_SERIES,
          stacked: false,
          leftYAxis: {
            showUnits: false,
          },
          statistic: Stats.AVERAGE,
          left: [
            new Metric({
              namespace: 'AWS/DynamoDB',
              metricName: `SuccessfulRequestLatency`,
              dimensionsMap: {
                TableName: tableName,
                Operation: 'GetItem',
              },
              label: 'Get latency',
              color: '#E02020',
              region: Stack.of(this).region,
            }),
            new Metric({
              namespace: 'AWS/DynamoDB',
              metricName: `SuccessfulRequestLatency`,
              dimensionsMap: {
                TableName: tableName,
                Operation: 'BatchGetItem',
              },
              label: 'Batch get latency',
              color: '#2DA02D',
              region: Stack.of(this).region,
            }),
          ],
          title: 'DynamoDB - Get latency (milliseconds)',
          region: Stack.of(this).region,
        }),
        new GraphWidget({
          width: 6,
          height: 6,
          legendPosition: LegendPosition.BOTTOM,
          period: Duration.minutes(1),
          view: GraphWidgetView.TIME_SERIES,
          stacked: false,
          leftYAxis: {
            showUnits: false,
          },
          statistic: Stats.AVERAGE,
          left: [
            new Metric({
              namespace: 'AWS/DynamoDB',
              metricName: `SuccessfulRequestLatency`,
              dimensionsMap: {
                TableName: tableName,
                Operation: 'PutItem',
              },
              label: 'Put latency',
              color: '#E02020',
              region: Stack.of(this).region,
            }),
            new Metric({
              namespace: 'AWS/DynamoDB',
              metricName: `SuccessfulRequestLatency`,
              dimensionsMap: {
                TableName: tableName,
                Operation: 'BatchWriteItem',
              },
              label: 'Batch write latency',
              color: '#2DA02D',
              region: Stack.of(this).region,
            }),
          ],
          title: 'DynamoDB - Put latency (milliseconds)',
          region: Stack.of(this).region,
        })
      ),
      new Row(
        new GraphWidget({
          width: 6,
          height: 6,
          legendPosition: LegendPosition.BOTTOM,
          period: Duration.minutes(1),
          view: GraphWidgetView.TIME_SERIES,
          stacked: false,
          leftYAxis: {
            showUnits: false,
          },
          statistic: Stats.SUM,
          left: [
            new Metric({
              namespace: 'AWS/DynamoDB',
              metricName: `SystemErrors`,
              dimensionsMap: {
                TableName: tableName,
                Operation: 'GetItem',
              },
              color: '#E02020',
              region: Stack.of(this).region,
            }),
            new Metric({
              namespace: 'AWS/DynamoDB',
              metricName: `SystemErrors`,
              dimensionsMap: {
                TableName: tableName,
                Operation: 'Scan',
              },
              color: '#FF7F0F',
              region: Stack.of(this).region,
            }),
            new Metric({
              namespace: 'AWS/DynamoDB',
              metricName: `SystemErrors`,
              dimensionsMap: {
                TableName: tableName,
                Operation: 'Query',
              },
              color: '#2DA02D',
              region: Stack.of(this).region,
            }),
            new Metric({
              namespace: 'AWS/DynamoDB',
              metricName: `SystemErrors`,
              dimensionsMap: {
                TableName: tableName,
                Operation: 'BatchGetItem',
              },
              color: '#9468BD',
              region: Stack.of(this).region,
            }),
          ],
          title: 'DynamoDB - System errors read (count)',
          region: Stack.of(this).region,
        }),
        new GraphWidget({
          width: 6,
          height: 6,
          legendPosition: LegendPosition.BOTTOM,
          period: Duration.minutes(1),
          view: GraphWidgetView.TIME_SERIES,
          stacked: false,
          leftYAxis: {
            showUnits: false,
          },
          statistic: Stats.SUM,
          left: [
            new Metric({
              namespace: 'AWS/DynamoDB',
              metricName: `SystemErrors`,
              dimensionsMap: {
                TableName: tableName,
                Operation: 'PutItem',
              },
              color: '#E02020',
              region: Stack.of(this).region,
            }),
            new Metric({
              namespace: 'AWS/DynamoDB',
              metricName: `SystemErrors`,
              dimensionsMap: {
                TableName: tableName,
                Operation: 'UpdateItem',
              },
              color: '#FF7F0F',
              region: Stack.of(this).region,
            }),
            new Metric({
              namespace: 'AWS/DynamoDB',
              metricName: `SystemErrors`,
              dimensionsMap: {
                TableName: tableName,
                Operation: 'DeleteItem',
              },
              color: '#2DA02D',
              region: Stack.of(this).region,
            }),
            new Metric({
              namespace: 'AWS/DynamoDB',
              metricName: `SystemErrors`,
              dimensionsMap: {
                TableName: tableName,
                Operation: 'BatchWriteItem',
              },
              color: '#9468BD',
              region: Stack.of(this).region,
            }),
          ],
          title: 'DynamoDB - System errors write (count)',
          region: Stack.of(this).region,
        })
      ),
      new Row(
        new GraphWidget({
          width: 8,
          height: 6,
          legendPosition: LegendPosition.BOTTOM,
          period: Duration.minutes(1),
          view: GraphWidgetView.TIME_SERIES,
          stacked: false,
          leftYAxis: {
            showUnits: false,
          },
          statistic: Stats.SUM,
          left: [
            new Metric({
              namespace: 'AWS/DynamoDB',
              metricName: `UserErrors`,
              dimensionsMap: {
                TableName: tableName,
              },
              color: '#E02020',
              region: Stack.of(this).region,
            }),
          ],
          title: 'DynamoDB - User errors (count)',
          region: Stack.of(this).region,
        })
      ),
    ];

    const sqsMetricsHeader = [
      new TextWidget({
        markdown: '## Amazon SQS Metrics',
        width: 24,
        height: 1,
      }),
    ];

    const dqlMetricsHeader = [
      new TextWidget({
        markdown: '## Amazon SQS Metrics - Dead Letter Queue',
        width: 24,
        height: 1,
      }),
    ];
    const dqlMetrics = [
      new Row(
        new GraphWidget({
          width: 6,
          height: 6,
          legendPosition: LegendPosition.BOTTOM,
          period: Duration.minutes(1),
          view: GraphWidgetView.TIME_SERIES,
          stacked: false,
          left: [
            new Metric({
              namespace: 'AWS/SQS',
              metricName: `NumberOfMessagesReceived`,
              dimensionsMap: {
                QueueName: deadLetterQueueName,
              },
              statistic: Stats.SUM,
              period: Duration.minutes(1),
              region: Stack.of(this).region,
            }),
          ],
          title: 'DLQ - Number Of Messages Received',
          region: Stack.of(this).region,
        }),
        new GraphWidget({
          width: 6,
          height: 6,
          legendPosition: LegendPosition.BOTTOM,
          period: Duration.minutes(1),
          view: GraphWidgetView.TIME_SERIES,
          stacked: false,
          left: [
            new Metric({
              namespace: 'AWS/SQS',
              metricName: `NumberOfMessagesDeleted`,
              dimensionsMap: {
                QueueName: deadLetterQueueName,
              },
              statistic: Stats.SUM,
              period: Duration.minutes(1),
              region: Stack.of(this).region,
            }),
          ],
          title: 'DLQ - Number Of Messages Deleted',
          region: Stack.of(this).region,
        }),
        new GraphWidget({
          width: 6,
          height: 6,
          legendPosition: LegendPosition.BOTTOM,
          period: Duration.minutes(1),
          view: GraphWidgetView.TIME_SERIES,
          stacked: false,
          left: [
            new Metric({
              namespace: 'AWS/SQS',
              metricName: `ApproximateNumberOfMessagesNotVisible`,
              dimensionsMap: {
                QueueName: deadLetterQueueName,
              },
              statistic: Stats.AVERAGE,
              period: Duration.minutes(1),
              region: Stack.of(this).region,
            }),
          ],
          title: 'DLQ - Approximate Number Of Messages Not Visible',
          region: Stack.of(this).region,
        }),
        new GraphWidget({
          width: 6,
          height: 6,
          legendPosition: LegendPosition.BOTTOM,
          period: Duration.minutes(1),
          view: GraphWidgetView.TIME_SERIES,
          stacked: false,
          left: [
            new Metric({
              namespace: 'AWS/SQS',
              metricName: `ApproximateAgeOfOldestMessage`,
              dimensionsMap: {
                QueueName: deadLetterQueueName,
              },
              statistic: Stats.MAXIMUM,
              period: Duration.minutes(1),
              region: Stack.of(this).region,
            }),
          ],
          title: 'DLQ - Approximate Age Of Oldest Message',
          region: Stack.of(this).region,
        })
      ),
    ];

    this.dashboard = new Dashboard(this, id, {
      dashboardName: `image-processing-dashboard-${environment}`,
      widgets: [
        lambdaMetricsHeader,
        lambdaMetrics,
        dynamoDBMetricsHeader,
        dynamoDBMetrics,
        sqsMetricsHeader,
        dqlMetricsHeader,
        dqlMetrics,
      ],
    });
  }
}
