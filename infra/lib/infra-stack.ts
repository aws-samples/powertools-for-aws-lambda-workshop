import { Stack, StackProps, CfnOutput, Duration } from "aws-cdk-lib";
import { Construct } from "constructs";
import { LambdaFunction } from "aws-cdk-lib/aws-events-targets";
import { Rule, Match } from "aws-cdk-lib/aws-events";
import { Frontend } from "./frontend";
import { ContentHubRepo } from "./content-hub-repository";
import { HttpOrigin } from "aws-cdk-lib/aws-cloudfront-origins";
import {
  AllowedMethods,
  CacheCookieBehavior,
  CachedMethods,
  CacheHeaderBehavior,
  CachePolicy,
  OriginRequestCookieBehavior,
  OriginRequestHeaderBehavior,
  OriginRequestPolicy,
  OriginRequestQueryStringBehavior,
  ResponseHeadersPolicy,
  ViewerProtocolPolicy,
} from "aws-cdk-lib/aws-cloudfront";

export class InfraStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const frontend = new Frontend(this, "frontend", {});

    const contentHubRepo = new ContentHubRepo(this, "content-hub-repo", {
      userPool: frontend.auth.userPool,
      userPoolClient: frontend.auth.userPoolClient,
    });
    frontend.addApiBehavior(contentHubRepo.api.domain);
    /* frontend.cdn.distribution.addBehavior(
      "/api/*",
      new HttpOrigin(contentHubRepo.api.domain),
      {
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachedMethods: CachedMethods.CACHE_GET_HEAD_OPTIONS,
        allowedMethods: AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        cachePolicy: new CachePolicy(this, "api-cache", {
          minTtl: Duration.seconds(0),
          maxTtl: Duration.seconds(1),
          defaultTtl: Duration.seconds(0),
          enableAcceptEncodingGzip: true,
          cookieBehavior: CacheCookieBehavior.none(),
          headerBehavior: CacheHeaderBehavior.allowList("Authorization"),
        }),
        originRequestPolicy: new OriginRequestPolicy(
          this,
          "api-origin-policy",
          {
            headerBehavior: OriginRequestHeaderBehavior.none(),
            cookieBehavior: OriginRequestCookieBehavior.none(),
            queryStringBehavior: OriginRequestQueryStringBehavior.allowList(
              "type",
              "length"
            ),
          }
        ),
        responseHeadersPolicy:
          ResponseHeadersPolicy.CORS_ALLOW_ALL_ORIGINS_WITH_PREFLIGHT_AND_SECURITY_HEADERS,
      }
    ); */

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

    new CfnOutput(this, "somestuff", {
      value: contentHubRepo.api.domain,
    });
  }
}
