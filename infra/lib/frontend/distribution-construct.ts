import { CfnOutput, Duration } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import {
  Distribution,
  ViewerProtocolPolicy,
  CachedMethods,
  AllowedMethods,
  CachePolicy,
  CacheCookieBehavior,
  CacheHeaderBehavior,
  ResponseHeadersPolicy,
  OriginRequestPolicy,
  OriginRequestHeaderBehavior,
  OriginRequestCookieBehavior,
  OriginRequestQueryStringBehavior,
} from 'aws-cdk-lib/aws-cloudfront';
import { HttpOrigin, S3Origin } from 'aws-cdk-lib/aws-cloudfront-origins';
import { NagSuppressions } from 'cdk-nag';
import { environment } from '../constants.js';

interface DistributionConstructProps {
  websiteBucket: Bucket;
}

export class DistributionConstruct extends Construct {
  public readonly distribution: Distribution;

  public constructor(
    scope: Construct,
    id: string,
    props: DistributionConstructProps
  ) {
    super(scope, id);

    this.distribution = new Distribution(this, 'distribution', {
      defaultBehavior: {
        origin: new S3Origin(props.websiteBucket),
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachedMethods: CachedMethods.CACHE_GET_HEAD_OPTIONS,
        allowedMethods: AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        cachePolicy: new CachePolicy(this, 's3-cache', {
          cachePolicyName: `s3-cache-${environment}`,
          minTtl: Duration.seconds(0),
          maxTtl: Duration.seconds(86400),
          defaultTtl: Duration.seconds(86400),
          cookieBehavior: CacheCookieBehavior.none(),
          enableAcceptEncodingGzip: true,
        }),
      },
      defaultRootObject: 'index.html',
      errorResponses: [
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
        },
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
        },
      ],
      enableIpv6: true,
      enabled: true,
    });

    new CfnOutput(this, 'DistributionDomainName', {
      value: this.distribution.distributionDomainName,
      description: 'The domain name where the website is hosted',
    });

    new CfnOutput(this, 'DistributionId', {
      value: this.distribution.distributionId,
    });

    NagSuppressions.addResourceSuppressions(this.distribution, [
      {
        id: 'AwsSolutions-CFR1',
        reason:
          "No geo restrictions are needed for this distribution, it's for a short-lived workshop.",
      },
      {
        id: 'AwsSolutions-CFR2',
        reason:
          "No WAF needed for this distribution, it's for a short-lived workshop.",
      },
      {
        id: 'AwsSolutions-CFR3',
        reason:
          "No logging needed for this distribution, it's for a short-lived workshop.",
      },
      {
        id: 'AwsSolutions-CFR4',
        reason:
          "Using default SSL settings for this distribution, it's for a short-lived workshop.",
      },
      {
        id: 'AwsSolutions-CFR5',
        reason:
          "No custom SSL certificate needed for this distribution, it's for a short-lived workshop.",
      }
    ]);
  }

  public addApiBehavior(apiDomain: string): void {
    this.distribution.addBehavior('/graphql', new HttpOrigin(apiDomain), {
      viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      cachedMethods: CachedMethods.CACHE_GET_HEAD_OPTIONS,
      allowedMethods: AllowedMethods.ALLOW_ALL,
      cachePolicy: new CachePolicy(this, 'api-cache', {
        cachePolicyName: `api-cache-${environment}`,
        minTtl: Duration.seconds(0),
        maxTtl: Duration.seconds(1),
        defaultTtl: Duration.seconds(0),
        enableAcceptEncodingGzip: true,
        cookieBehavior: CacheCookieBehavior.none(),
        headerBehavior: CacheHeaderBehavior.allowList(
          'Authorization',
          'Access-Control-Allow-Origin',
          'Access-Control-Request-Headers',
          'Access-Control-Request-Method'
        ),
      }),
      originRequestPolicy: new OriginRequestPolicy(this, 'api-origin-policy', {
        originRequestPolicyName: `api-origin-policy-${environment}`,
        headerBehavior: OriginRequestHeaderBehavior.none(),
        cookieBehavior: OriginRequestCookieBehavior.none(),
        queryStringBehavior: OriginRequestQueryStringBehavior.none(),
      }),
      responseHeadersPolicy:
        ResponseHeadersPolicy.CORS_ALLOW_ALL_ORIGINS_WITH_PREFLIGHT_AND_SECURITY_HEADERS,
    });
  }
}
