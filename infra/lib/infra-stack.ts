import { Stack, StackProps, CfnOutput } from "aws-cdk-lib";
import { Construct } from "constructs";
import { LambdaFunction } from "aws-cdk-lib/aws-events-targets";
import { Rule, Match } from "aws-cdk-lib/aws-events";
import { Frontend } from "./frontend";
import { ContentHubRepo } from "./content-hub-repository";

export class InfraStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const frontend = new Frontend(this, "frontend", {});

    const contentHubRepo = new ContentHubRepo(this, "content-hub-repo", {
      userPool: frontend.auth.userPool,
      userPoolClient: frontend.auth.userPoolClient,
    });
    frontend.addApiBehavior(contentHubRepo.api.apiEndpoint);

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

    new CfnOutput(this, "AWSRegion", {
      value: Stack.of(this).region,
    });
  }
}
