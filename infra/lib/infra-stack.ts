import { Stack, StackProps, CfnOutput, Duration } from "aws-cdk-lib";
import { Construct } from "constructs";
import { LambdaFunction } from "aws-cdk-lib/aws-events-targets";
import {Rule, Match, Schedule} from "aws-cdk-lib/aws-events";
import { Frontend } from "./frontend";
import { ContentHubRepo } from "./content-hub-repository";
import {NodejsFunction} from "aws-cdk-lib/aws-lambda-nodejs";

export class InfraStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const frontend = new Frontend(this, "frontend", {});

    const contentHubRepo = new ContentHubRepo(this, "content-hub-repo", {
      userPool: frontend.auth.userPool,
      userPoolClient: frontend.auth.userPoolClient,
    });
    frontend.addApiBehavior(contentHubRepo.api.domain);

    const rule = new Rule(this, "new-uploads", {
      eventPattern: {
        source: Match.anyOf("aws.s3"),
        detailType: Match.anyOf("Object Created"),
        detail: {
          bucket: {
            name: Match.anyOf(
              contentHubRepo.storage.landingZoneBucket.bucketName
            ),
          },
          object: { key: Match.prefix("uploads/") },
          reason: Match.anyOf("PutObject"),
        },
      },
    });
    rule.addTarget(
      new LambdaFunction(contentHubRepo.functions.markCompleteUploadFn)
    );

    const intervalInMinutes = 1;

    const loadTestFunction = new NodejsFunction(this, 'traffic-generator-lambda', {
      entry: "../functions/mark-complete-upload.ts",
      environment: {
        INTERVALS_IN_MINUTES: intervalInMinutes.toString(),
      },
    });

    const cronRule = new Rule(this, 'traffic-generator-cron', {
      schedule: Schedule.expression('cron(0/'+ intervalInMinutes +' * * * ? *)')
    })

    cronRule.addTarget(new LambdaFunction(loadTestFunction))

    new CfnOutput(this, "AWSRegion", {
      value: Stack.of(this).region,
    });
  }
}
