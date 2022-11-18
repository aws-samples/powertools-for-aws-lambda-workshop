import {aws_fis as fis, aws_iam as iam, aws_logs as logs, Stack, StackProps} from "aws-cdk-lib";
import { Construct } from "constructs";
import { Effect } from "aws-cdk-lib/aws-iam";

interface ExperimentsConstructProps extends StackProps {
    parameterStoreName: string
    ssmAutomationDocumentName: string
}

export class ExperimentsConstruct extends Construct {

    constructor(scope: Construct, id: string, props: ExperimentsConstructProps) {
        super(scope, id);

        const fisRole = new iam.Role(this, "chaos-experiments-fis-iam-role", {
            assumedBy: new iam.ServicePrincipal("fis.amazonaws.com", {
                conditions: {
                    StringEquals: {
                        "aws:SourceAccount": Stack.of(this).account,
                    },
                    ArnLike: {
                        "aws:SourceArn": `arn:aws:fis:${process.env.AWS_REGION}:${Stack.of(this).account}:experiment/*`,
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
                    "ssm:StopAutomationExecution",
                    "ssm:GetAutomationExecution",
                    "ssm:StartAutomationExecution"
                ],
            })
        );

        fisRole.addToPolicy(
            new iam.PolicyStatement({
                effect: Effect.ALLOW,
                resources: [`arn:aws:iam::*:role/*`],
                actions: ["iam:PassRole"],
            })
        );

        fisRole.addToPolicy(
            new iam.PolicyStatement({
                effect: Effect.ALLOW,
                resources: [`*`],
                actions: [
                    "logs:CreateLogDelivery",
                    "logs:PutResourcePolicy",
                    "logs:DescribeResourcePolicies",
                    "logs:DescribeLogGroups"
                ],
            })
        );

        const ssmaPutParameterStoreRole = new iam.Role(
            this,
            "ssma-put-parameterstore-role",
            {
                assumedBy: new iam.CompositePrincipal(
                    new iam.ServicePrincipal("iam.amazonaws.com"),
                    new iam.ServicePrincipal("ssm.amazonaws.com")
                ),
            }
        );

        ssmaPutParameterStoreRole.addToPolicy(
            new iam.PolicyStatement({
                effect: Effect.ALLOW,
                resources: [`*`],
                actions: ["ssm:PutParameter"],
            })
        );


        const startAutomation = {
            actionId: "aws:ssm:start-automation-execution",
            description: "Put config into parameter store to enable Lambda Chaos.",
            parameters: {
                documentArn: `arn:aws:ssm:${process.env.AWS_REGION}:${Stack.of(this).account}:document/${props.ssmAutomationDocumentName}`,
                documentParameters: JSON.stringify({
                    DurationMinutes: "PT1M",
                    AutomationAssumeRole: ssmaPutParameterStoreRole.roleArn,
                    ParameterName: props.parameterStoreName,
                    ParameterValue: '{ "delay": 1000, "is_enabled": false, "error_code": 500, "exception_msg": "This is chaos", "rate": 1, "fault_type": "exception"}',
                    RollbackValue: '{ "delay": 1000, "is_enabled": false, "error_code": 404, "exception_msg": "This is chaos", "rate": 1, "fault_type": "exception"}'
                }),
                maxDuration: "PT5M",
            },
        };


        // Experiment
        const logGroup = new logs.LogGroup(this, `/chaos-experiment/${id}`);
        const templateEnableLambdaFault = new fis.CfnExperimentTemplate(
            this,
            "chaos-experiment-log-group",
            {
                description: "Chaos experiment for the AWS Lambda Powertools for TypeScript workshop",
                roleArn: fisRole.roleArn,
                stopConditions: [
                    { source: 'none' }
                ],
                tags: {
                    Name: `AWS Lambda Powertools for TypeScript workshop - ${id}`,
                    Stackname: Stack.of(this).stackName,
                },
                actions: {
                    ssmaAction: startAutomation,
                },
                targets: {},
                logConfiguration: {
                    logSchemaVersion: 1,

                    // the properties below are optional
                    cloudWatchLogsConfiguration: {
                        "LogGroupArn": logGroup.logGroupArn
                    },
                },
            }
        );
    }
}
