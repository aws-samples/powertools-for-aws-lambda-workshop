import { RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { CfnExperimentTemplate } from 'aws-cdk-lib/aws-fis';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Role, ServicePrincipal, PolicyStatement, CompositePrincipal, Effect, PolicyDocument } from 'aws-cdk-lib/aws-iam';
import { NagSuppressions } from 'cdk-nag';
import { environment } from '../constants';

interface ExperimentsConstructProps extends StackProps {
  parameterStoreName: string
  ssmAutomationDocumentName: string
  experimentName: string
}

export class ExperimentsConstruct extends Construct {

  public constructor(scope: Construct, id: string, props: ExperimentsConstructProps) {
    super(scope, id);

    const { parameterStoreName, ssmAutomationDocumentName, experimentName } = props;

    const regionAccountFragment = `${Stack.of(this).region}:${Stack.of(this).account}`;
    const ssmRegionalAccountPrefix = `arn:aws:ssm:${regionAccountFragment}`;
    const ssmDocumentArn = `${ssmRegionalAccountPrefix}:document/${ssmAutomationDocumentName}`;

    const logGroup = new LogGroup(this, `chaos-experiment-logs-${id}`, {
      logGroupName: `/workshop/chaos-experiments/${experimentName}-${Stack.of(this).account}-${Stack.of(this).region}-${environment}`,
      retention: RetentionDays.FIVE_DAYS,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const fisRole = new Role(this, 'chaos-experiments-fis-iam-role', {
      roleName: `fis-role-${experimentName}-${environment}`,
      assumedBy: new ServicePrincipal('fis.amazonaws.com', {
        conditions: {
          StringEquals: {
            'aws:SourceAccount': Stack.of(this).account,
          },
          ArnLike: {
            'aws:SourceArn': `arn:aws:fis:${regionAccountFragment}:experiment/*`,
          },
        },
      }),
      inlinePolicies: {
        'ssm-automation': new PolicyDocument({
          statements: [
            new PolicyStatement({
              effect: Effect.ALLOW,
              actions: [
                'ssm:StopAutomationExecution',
                'ssm:GetAutomationExecution',
                'ssm:StartAutomationExecution'
              ],
              resources: [
                ssmDocumentArn,
                `${ssmRegionalAccountPrefix}:automation-definition/*:*`,
                `${ssmRegionalAccountPrefix}:automation-execution/*`
              ]
            }),
          ]
        }),
        'cloudwatch-logs': new PolicyDocument({
          statements: [
            /*
            new PolicyStatement({
              effect: Effect.ALLOW,
              actions: [
                "logs:CreateLogStream"
              ],
              resources: [
                `arn:aws:logs:*:${Stack.of(this).account}:log-group:*`
              ]
            }),
            new PolicyStatement({
              effect: Effect.ALLOW,
              actions: [
                "logs:PutLogEvents"
              ],
              resources: [
                `arn:aws:logs:*:${Stack.of(this).account}:log-group:*:log-stream:*`
              ],
            }),
            */
            new PolicyStatement({
              effect: Effect.ALLOW,
              actions: [
                'logs:CreateLogDelivery',
                'logs:PutResourcePolicy',
                'logs:DescribeResourcePolicies',
                'logs:DescribeLogGroups'
              ],
              resources: ['*']
            })
          ]
        }),
        'pass-iam-role': new PolicyDocument({
          statements: [
            new PolicyStatement({
              effect: Effect.ALLOW,
              resources: [`arn:aws:iam::*:role/*`],
              actions: ['iam:PassRole'],
            })
          ]
        })
      }
    });

    NagSuppressions.addResourceSuppressions(fisRole, [
      {
        id: 'AwsSolutions-IAM5',
        reason: 'Wildcard needed to allow access to CloudWatch.',
      },
    ], true);

    const ssmaPutParameterStoreRole = new Role(
      this,
      'ssma-put-parameterstore-role',
      {
        roleName: `automation-role-experiment-${experimentName}-${environment}`,
        assumedBy: new CompositePrincipal(
          new ServicePrincipal('iam.amazonaws.com'),
          new ServicePrincipal('ssm.amazonaws.com')
        ),
        inlinePolicies: {
          'ssm-automation': new PolicyDocument({
            statements: [
              new PolicyStatement({
                effect: Effect.ALLOW,
                actions: [
                  'ssm:PutParameter',
                ],
                resources: [
                  `arn:aws:ssm:${regionAccountFragment}:parameter/${parameterStoreName}`,
                ],
              }),
            ],
          }),
        }
      }
    );

    const startAutomation = {
      actionId: 'aws:ssm:start-automation-execution',
      description: 'Change values of a Parameter Store to enable the fault injection in a Lambda function.',
      parameters: {
        documentArn: ssmDocumentArn,
        documentParameters: JSON.stringify({
          DurationMinutes: 'PT12M',
          AutomationAssumeRole: ssmaPutParameterStoreRole.roleArn,
          ParameterName: parameterStoreName,
          ParameterValue: JSON.stringify({
            "isEnabled": true,
            "failureMode": "exception",
            "rate": 1,
            "minLatency": 100,
            "maxLatency": 1000,
            "exceptionMsg": "Unexpected error occurred while trying to connect to DynamoDB",
            "statusCode": 404,
            "diskSpace": 100,
            "denylist": [
              "dynamodb.*.amazonaws.com"
            ]
          }),
          RollbackValue: JSON.stringify({
            "isEnabled": false,
            "failureMode": "exception",
            "rate": 1,
            "minLatency": 100,
            "maxLatency": 1000,
            "exceptionMsg": "Unexpected error occurred while trying to connect to DynamoDB",
            "statusCode": 404,
            "diskSpace": 100,
            "denylist": [
              "dynamodb.*.amazonaws.com"
            ]
          })
        }),
        maxDuration: 'PT15M',
      },
    };

    // Experiment
    new CfnExperimentTemplate(
      this,
      id,
      {
        description: 'Chaos experiment for the AWS Lambda Powertools for TypeScript workshop',
        roleArn: fisRole.roleArn,
        stopConditions: [
          { source: 'none' }
        ],
        tags: {
          Name: `Chaos Experiment - ${id} - ${environment.toUpperCase()}`,
          Stackname: Stack.of(this).stackName,
        },
        actions: {
          chaosExperiment: startAutomation,
        },
        targets: {},
        logConfiguration: {
          logSchemaVersion: 1,
          cloudWatchLogsConfiguration: {
            'LogGroupArn': logGroup.logGroupArn
          },
        },
      }
    );
  }
}
