import { Stack } from "aws-cdk-lib"; 

const dashboardContent = {
  widgets: [
    {
      height: 6,
      width: 6,
      y: 1,
      x: 12,
      type: 'metric',
      properties: {
        metrics: [
          [
            'AWS/Lambda',
            'ConcurrentExecutions',
            'FunctionName',
            'process-image-name-dev',
            {
              stat: 'Maximum',
              id: 'm0'
            }
          ]
        ],
        legend: {
          position: 'bottom'
        },
        period: 60,
        view: 'timeSeries',
        stacked: false,
        start: '-PT15M',
        end: 'P0D',
        title: 'Lambda - ConcurrentExecutions',
        region: process.env.CDK_DEFAULT_REGION
      }
    },
    {
      height: 6,
      width: 6,
      y: 1,
      x: 6,
      type: 'metric',
      properties: {
        metrics: [
          [
            'AWS/Lambda',
            'Duration',
            'FunctionName',
            'process-image-name-dev',
            {
              stat: 'Average',
              id: 'm0',
              region: process.env.CDK_DEFAULT_REGION
            }
          ]
        ],
        legend: {
          position: 'bottom'
        },
        period: 60,
        view: 'timeSeries',
        stacked: false,
        start: '-PT15M',
        end: 'P0D',
        title: 'Lambda - Duration',
        region: process.env.CDK_DEFAULT_REGION
      }
    },
    {
      height: 6,
      width: 8,
      y: 7,
      x: 8,
      type: 'metric',
      properties: {
        metrics: [
          [
            'AWS/Lambda',
            'Errors',
            'FunctionName',
            'process-image-name-dev',
            {
              stat: 'Sum',
              id: 'm0'
            }
          ]
        ],
        legend: {
          position: 'bottom'
        },
        period: 60,
        view: 'timeSeries',
        stacked: false,
        start: '-PT15M',
        end: 'P0D',
        title: 'Lambda - Errors',
        region: process.env.CDK_DEFAULT_REGION
      }
    },
    {
      height: 6,
      width: 6,
      y: 1,
      x: 0,
      type: 'metric',
      properties: {
        metrics: [
          [
            'AWS/Lambda',
            'Invocations',
            'FunctionName',
            'process-image-name-dev',
            {
              stat: 'Sum',
              id: 'm0'
            }
          ]
        ],
        legend: {
          position: 'bottom'
        },
        period: 60,
        view: 'timeSeries',
        stacked: false,
        start: '-PT15M',
        end: 'P0D',
        title: 'Lambda - Invocations',
        region: process.env.CDK_DEFAULT_REGION
      }
    },
    {
      height: 6,
      width: 8,
      y: 7,
      x: 0,
      type: 'metric',
      properties: {
        metrics: [
          [
            'AWS/Lambda',
            'Throttles',
            'FunctionName',
            'process-image-name-dev',
            {
              stat: 'Sum',
              id: 'm0',
              region: process.env.CDK_DEFAULT_REGION
            }
          ]
        ],
        legend: {
          position: 'bottom'
        },
        period: 60,
        view: 'timeSeries',
        stacked: false,
        start: '-PT15M',
        end: 'P0D',
        title: 'Lambda - Throttles',
        region: process.env.CDK_DEFAULT_REGION
      }
    },
    {
      height: 6,
      width: 6,
      y: 1,
      x: 18,
      type: 'metric',
      properties: {
        metrics: [
          [
            'AWS/Lambda',
            'IteratorAge',
            'FunctionName',
            'process-image-name-dev',
            {
              stat: 'Average',
              id: 'm0',
              region: process.env.CDK_DEFAULT_REGION
            }
          ]
        ],
        legend: {
          position: 'bottom'
        },
        period: 60,
        view: 'timeSeries',
        stacked: false,
        start: '-PT15M',
        end: 'P0D',
        title: 'Lambda - IteratorAge',
        region: process.env.CDK_DEFAULT_REGION
      }
    },
    {
      height: 6,
      width: 8,
      y: 7,
      x: 16,
      type: 'metric',
      properties: {
        metrics: [
          [
            'AWS/Lambda',
            'DeadLetterErrors',
            'FunctionName',
            'process-image-name-dev',
            {
              stat: 'Sum',
              id: 'm0',
              region: process.env.CDK_DEFAULT_REGION
            }
          ]
        ],
        legend: {
          position: 'bottom'
        },
        period: 60,
        view: 'timeSeries',
        stacked: false,
        start: '-PT15M',
        end: 'P0D',
        title: 'Lambda - DeadLetterErrors',
        region: process.env.CDK_DEFAULT_REGION
      }
    },
    {
      height: 6,
      width: 6,
      y: 14,
      x: 0,
      type: 'metric',
      properties: {
        metrics: [
          [
            'AWS/DynamoDB',
            'ProvisionedReadCapacityUnits',
            'TableName',
            'FilesTable-dev',
            {
              label: 'Provisioned',
              color: '#E02020'
            }
          ],
          [
            '.',
            'ConsumedReadCapacityUnits',
            '.',
            '.',
            {
              stat: 'Sum',
              id: 'm1',
              visible: false
            }
          ],
          [
            {
              expression: 'm1/PERIOD(m1)',
              label: 'Consumed',
              id: 'e1',
              color: '#0073BB',
              region: process.env.CDK_DEFAULT_REGION
            }
          ]
        ],
        title: 'DynamoDB - Read usage (average units/second)',
        view: 'timeSeries',
        stacked: false,
        region: process.env.CDK_DEFAULT_REGION,
        stat: 'Average',
        period: 60,
        yAxis: {
          left: {
            showUnits: false
          }
        },
        start: '-PT1H',
        end: 'P0D'
      }
    },
    {
      height: 6,
      width: 6,
      y: 14,
      x: 6,
      type: 'metric',
      properties: {
        title: 'DynamoDB - Read throttled requests (count)',
        view: 'timeSeries',
        stacked: false,
        region: process.env.CDK_DEFAULT_REGION,
        stat: 'Sum',
        period: 60,
        yAxis: {
          left: {
            showUnits: false
          }
        },
        metrics: [
          [
            'AWS/DynamoDB',
            'ThrottledRequests',
            'TableName',
            'FilesTable-dev',
            'Operation',
            'GetItem',
            {
              color: '#0073BB'
            }
          ],
          [
            '...',
            'Scan',
            {
              color: '#FF7F0F'
            }
          ],
          [
            '...',
            'Query',
            {
              color: '#2DA02D'
            }
          ],
          [
            '...',
            'BatchGetItem',
            {
              color: '#9468BD'
            }
          ]
        ],
        start: '-PT3H',
        end: 'P0D'
      }
    },
    {
      height: 6,
      width: 6,
      y: 14,
      x: 18,
      type: 'metric',
      properties: {
        title: 'DynamoDB - Write throttled requests (count)',
        view: 'timeSeries',
        stacked: false,
        region: process.env.CDK_DEFAULT_REGION,
        stat: 'Sum',
        period: 60,
        yAxis: {
          left: {
            showUnits: false
          }
        },
        metrics: [
          [
            'AWS/DynamoDB',
            'ThrottledRequests',
            'TableName',
            'FilesTable-dev',
            'Operation',
            'PutItem',
            {
              color: '#0073BB'
            }
          ],
          [
            '...',
            'UpdateItem',
            {
              color: '#FF7F0F'
            }
          ],
          [
            '...',
            'DeleteItem',
            {
              color: '#2DA02D'
            }
          ],
          [
            '...',
            'BatchWriteItem',
            {
              color: '#9468BD'
            }
          ]
        ],
        start: '-PT3H',
        end: 'P0D'
      }
    },
    {
      height: 6,
      width: 6,
      y: 14,
      x: 12,
      type: 'metric',
      properties: {
        title: 'DynamoDB - Write usage (average units/second)',
        view: 'timeSeries',
        stacked: false,
        region: process.env.CDK_DEFAULT_REGION,
        stat: 'Average',
        period: 60,
        yAxis: {
          left: {
            showUnits: false
          }
        },
        metrics: [
          [
            'AWS/DynamoDB',
            'ProvisionedWriteCapacityUnits',
            'TableName',
            'FilesTable-dev',
            {
              label: 'Provisioned',
              color: '#E02020'
            }
          ],
          [
            '.',
            'ConsumedWriteCapacityUnits',
            '.',
            '.',
            {
              stat: 'Sum',
              id: 'm1',
              visible: false
            }
          ],
          [
            {
              expression: 'm1/PERIOD(m1)',
              label: 'Consumed',
              id: 'e1',
              color: '#0073BB',
              region: process.env.CDK_DEFAULT_REGION
            }
          ]
        ],
        start: '-PT3H',
        end: 'P0D'
      }
    },
    {
      height: 6,
      width: 12,
      y: 20,
      x: 0,
      type: 'metric',
      properties: {
        title: 'DynamoDB - Get latency (milliseconds)',
        view: 'timeSeries',
        stacked: false,
        region: process.env.CDK_DEFAULT_REGION,
        stat: 'Average',
        period: 60,
        yAxis: {
          left: {
            showUnits: false
          }
        },
        metrics: [
          [
            'AWS/DynamoDB',
            'SuccessfulRequestLatency',
            'TableName',
            'FilesTable-dev',
            'Operation',
            'GetItem',
            {
              color: '#0073BB',
              label: 'Get latency'
            }
          ],
          [
            '...',
            'BatchGetItem',
            {
              color: '#9468BD',
              label: 'Batch get latency'
            }
          ]
        ],
        start: '-PT3H',
        end: 'P0D'
      }
    },
    {
      height: 6,
      width: 12,
      y: 20,
      x: 12,
      type: 'metric',
      properties: {
        title: 'DynamoDB - Put latency (milliseconds)',
        view: 'timeSeries',
        stacked: false,
        region: process.env.CDK_DEFAULT_REGION,
        stat: 'Average',
        period: 60,
        yAxis: {
          left: {
            showUnits: false
          }
        },
        metrics: [
          [
            'AWS/DynamoDB',
            'SuccessfulRequestLatency',
            'TableName',
            'FilesTable-dev',
            'Operation',
            'PutItem',
            {
              stat: 'Average',
              color: '#0073BB',
              label: 'Put latency'
            }
          ],
          [
            '...',
            'BatchWriteItem',
            {
              color: '#9468BD',
              label: 'Batch write latency'
            }
          ]
        ],
        start: '-PT3H',
        end: 'P0D'
      }
    },
    {
      height: 6,
      width: 8,
      y: 26,
      x: 0,
      type: 'metric',
      properties: {
        title: 'DynamoDB - System errors read (count)',
        view: 'timeSeries',
        stacked: false,
        region: process.env.CDK_DEFAULT_REGION,
        stat: 'Sum',
        period: 60,
        yAxis: {
          left: {
            showUnits: false
          }
        },
        metrics: [
          [
            'AWS/DynamoDB',
            'SystemErrors',
            'TableName',
            'FilesTable-dev',
            'Operation',
            'GetItem',
            {
              color: '#0073BB'
            }
          ],
          [
            '...',
            'Scan',
            {
              color: '#FF7F0F'
            }
          ],
          [
            '...',
            'Query',
            {
              color: '#2DA02D'
            }
          ],
          [
            '...',
            'BatchGetItem',
            {
              color: '#9468BD'
            }
          ]
        ],
        start: '-PT3H',
        end: 'P0D'
      }
    },
    {
      height: 6,
      width: 8,
      y: 26,
      x: 8,
      type: 'metric',
      properties: {
        title: 'DynamoDB - System errors write (count)',
        view: 'timeSeries',
        stacked: false,
        region: process.env.CDK_DEFAULT_REGION,
        stat: 'Sum',
        period: 60,
        yAxis: {
          left: {
            showUnits: false
          }
        },
        metrics: [
          [
            'AWS/DynamoDB',
            'SystemErrors',
            'TableName',
            'FilesTable-dev',
            'Operation',
            'PutItem',
            {
              color: '#0073BB'
            }
          ],
          [
            '...',
            'UpdateItem',
            {
              color: '#FF7F0F'
            }
          ],
          [
            '...',
            'DeleteItem',
            {
              color: '#2DA02D'
            }
          ],
          [
            '...',
            'BatchWriteItem',
            {
              color: '#9468BD'
            }
          ]
        ],
        start: '-PT3H',
        end: 'P0D'
      }
    },
    {
      height: 6,
      width: 8,
      y: 26,
      x: 16,
      type: 'metric',
      properties: {
        title: 'User errors (count)',
        view: 'timeSeries',
        stacked: false,
        region: process.env.CDK_DEFAULT_REGION,
        stat: 'Sum',
        period: 60,
        yAxis: {
          left: {
            showUnits: false
          }
        },
        metrics: [
          [
            'AWS/DynamoDB',
            'UserErrors',
            'TableName',
            'FilesTable-dev'
          ]
        ],
        start: '-PT3H',
        end: 'P0D'
      }
    },
    {
      height: 6,
      width: 6,
      y: 33,
      x: 0,
      type: 'metric',
      properties: {
        view: 'timeSeries',
        stacked: false,
        metrics: [
          [
            'AWS/SQS',
            'NumberOfMessagesReceived',
            'QueueName',
            'ImageProcessing-Queue-358160174743-dev',
            {
              stat: 'Sum'
            }
          ]
        ],
        region: process.env.CDK_DEFAULT_REGION,
        title: 'SQS - Number Of Messages Received',
        period: 60,
        start: '-PT3H',
        end: 'P0D'
      }
    },
    {
      height: 6,
      width: 6,
      y: 33,
      x: 6,
      type: 'metric',
      properties: {
        view: 'timeSeries',
        stacked: false,
        metrics: [
          [
            'AWS/SQS',
            'NumberOfMessagesDeleted',
            'QueueName',
            'ImageProcessing-Queue-358160174743-dev',
            {
              stat: 'Sum'
            }
          ]
        ],
        region: process.env.CDK_DEFAULT_REGION,
        title: 'SQS - Number Of Messages Deleted',
        period: 60,
        start: '-PT3H',
        end: 'P0D'
      }
    },
    {
      height: 6,
      width: 6,
      y: 33,
      x: 12,
      type: 'metric',
      properties: {
        view: 'timeSeries',
        stacked: false,
        metrics: [
          [
            'AWS/SQS',
            'ApproximateNumberOfMessagesNotVisible',
            'QueueName',
            'ImageProcessing-Queue-358160174743-dev',
            {
              stat: 'Average'
            }
          ]
        ],
        region: process.env.CDK_DEFAULT_REGION,
        title: 'SQS - Approximate Number Of Messages Not Visible',
        period: 60,
        start: '-PT3H',
        end: 'P0D'
      }
    },
    {
      type: 'metric',
      x: 18,
      y: 33,
      width: 6,
      height: 6,
      properties: {
        view: 'timeSeries',
        stacked: false,
        metrics: [
          [
            'AWS/SQS',
            'ApproximateAgeOfOldestMessage',
            'QueueName',
            'ImageProcessing-Queue-358160174743-dev',
            {
              stat: 'Maximum'
            }
          ]
        ],
        region: process.env.CDK_DEFAULT_REGION,
        title: 'Approximate Age Of Oldest Message',
        period: 60,
        start: '-PT3H',
        end: 'P0D'
      }
    },
    {
      type: 'text',
      x: 0,
      y: 0,
      width: 24,
      height: 1,
      properties: {
        markdown: '## AWS Lambda metrics',
        background: 'transparent'
      }
    },
    {
      type: 'text',
      x: 0,
      y: 13,
      width: 24,
      height: 1,
      properties: {
        markdown: '## Amazon DynamoDB metrics',
        background: 'transparent'
      }
    },
    {
      type: 'text',
      x: 0,
      y: 32,
      width: 24,
      height: 1,
      properties: {
        markdown: '## Amazon SQS metrics',
        background: 'transparent'
      }
    }
  ]
};

export {
  dashboardContent
};