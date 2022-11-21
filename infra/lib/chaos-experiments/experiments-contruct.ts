import { aws_fis as fis, aws_iam as iam, aws_logs as logs, Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Effect } from 'aws-cdk-lib/aws-iam';

interface ExperimentsConstructProps extends StackProps {
  parameterStoreName: string
  ssmAutomationDocumentName: string
}

export class ExperimentsConstruct extends Construct {

  constructor(scope: Construct, id: string, props: ExperimentsConstructProps) {
    super(scope, id);

    const fisRole = new iam.Role(this, 'chaos-experiments-fis-iam-role', {
      assumedBy: new iam.ServicePrincipal('fis.amazonaws.com', {
        conditions: {
          StringEquals: {
            'aws:SourceAccount': Stack.of(this).account,
          },
          ArnLike: {
            'aws:SourceArn': `arn:aws:fis:${process.env.AWS_REGION}:${Stack.of(this).account}:experiment/*`,
          },
        },
      }),
    });

    // TODO: remove *
    fisRole.addToPolicy(
      new iam.PolicyStatement({
        effect: Effect.ALLOW,
        resources: [`*`],
        actions: [
          'ssm:StopAutomationExecution',
          'ssm:GetAutomationExecution',
          'ssm:StartAutomationExecution'
        ],
      })
    );

    fisRole.addToPolicy(
      new iam.PolicyStatement({
        effect: Effect.ALLOW,
        resources: [`arn:aws:iam::*:role/*`],
        actions: ['iam:PassRole'],
      })
    );

    fisRole.addToPolicy(
      new iam.PolicyStatement({
        effect: Effect.ALLOW,
        resources: [`*`],
        actions: [
          'logs:CreateLogDelivery',
          'logs:PutResourcePolicy',
          'logs:DescribeResourcePolicies',
          'logs:DescribeLogGroups'
        ],
      })
    );

    const ssmaPutParameterStoreRole = new iam.Role(
      this,
      'ssma-put-parameterstore-role',
      {
        assumedBy: new iam.CompositePrincipal(
          new iam.ServicePrincipal('iam.amazonaws.com'),
          new iam.ServicePrincipal('ssm.amazonaws.com')
        ),
      }
    );

    ssmaPutParameterStoreRole.addToPolicy(
      new iam.PolicyStatement({
        effect: Effect.ALLOW,
        resources: [`*`],
        actions: ['ssm:PutParameter'],
      })
    );

    const startAutomation = {
      actionId: 'aws:ssm:start-automation-execution',
      description: 'Change values of a Parameter Store to enable the fault injection in a Lambda function.',
      parameters: {
        documentArn: `arn:aws:ssm:${process.env.AWS_REGION}:${Stack.of(this).account}:document/${props.ssmAutomationDocumentName}`,
        documentParameters: JSON.stringify({
          DurationMinutes: 'PT12M',
          AutomationAssumeRole: ssmaPutParameterStoreRole.roleArn,
          ParameterName: props.parameterStoreName,
          ParameterValue: '{"isEnabled": true, "failureMode": "denylist", "rate": 1, "denylist": ["dynamodb.*.amazonaws.com"]}',
          RollbackValue: '{"isEnabled": false, "failureMode": "denylist", "rate": 1, "denylist": ["dynamodb.*.amazonaws.com"]}'
        }),
        maxDuration: 'PT15M',
      },
    };

    // Experiment
    const logGroup = new logs.LogGroup(this, `/chaos-experiment/${id}`);

    const templateEnableLambdaFault = new fis.CfnExperimentTemplate(
      this,
      id,
      {
        description: 'Chaos experiment for the AWS Lambda Powertools for TypeScript workshop',
        roleArn: fisRole.roleArn,
        stopConditions: [
          { source: 'none' }
        ],
        tags: {
          Name: `Chaos Experiment - ${id}`,
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
