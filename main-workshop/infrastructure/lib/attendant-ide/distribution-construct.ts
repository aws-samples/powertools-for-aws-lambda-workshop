import { CfnOutput, Duration, RemovalPolicy, type StackProps } from 'aws-cdk-lib';
import {
  AllowedMethods,
  CacheCookieBehavior,
  CacheHeaderBehavior,
  CachePolicy,
  CacheQueryStringBehavior,
  CachedMethods,
  Distribution,
  OriginProtocolPolicy,
  ViewerProtocolPolicy,
} from 'aws-cdk-lib/aws-cloudfront';
import { HttpOrigin } from 'aws-cdk-lib/aws-cloudfront-origins';
import { NagSuppressions } from 'cdk-nag';
import { Construct } from 'constructs';
import {
  customSecurityHeader,
  customSecurityHeaderValue,
} from './constants';

interface DistributionConstructProps extends StackProps {
  /**
   * The origin to use for the distribution.
   */
  origin: string;
  /**
   * The instance ID to track for cache invalidation.
   * When this changes, CloudFront cache will be invalidated.
   */
  instanceId?: string;
}

export class DistributionConstruct extends Construct {
  public readonly ideUrl: string;
  public readonly healthCheckEndpoint: string;

  public constructor(
    scope: Construct,
    id: string,
    props: DistributionConstructProps
  ) {
    super(scope, id);

    const { origin, instanceId } = props;

    const cachePolicy = new CachePolicy(this, 'ide-cache', {
      cachePolicyName: 'ide-cache',
      minTtl: Duration.seconds(0),
      maxTtl: Duration.seconds(86400),
      defaultTtl: Duration.seconds(86400),
      cookieBehavior: CacheCookieBehavior.all(),
      headerBehavior: CacheHeaderBehavior.allowList(
        'Sec-Websocket-Extensions',
        'Accept',
        'Access-Control-Request-Method',
        'Access-Control-Request-Headers',
        'Sec-Websocket-Key',
        'Host',
        'Accept-Encoding',
        'Sec-WebSocket-Protocol',
        'Sec-Websocket-Version'
      ),
      queryStringBehavior: CacheQueryStringBehavior.all(),
    });

    // Ensure cache policy is destroyed when stack is deleted
    cachePolicy.applyRemovalPolicy(RemovalPolicy.DESTROY);

    // Use instance ID in distribution comment to force cache behavior update
    // This helps CloudFront recognize when the backend has changed
    const distributionComment = instanceId
      ? `IDE Distribution - Instance: ${instanceId.substring(0, 12)}`
      : 'IDE Distribution';

    const distribution = new Distribution(this, 'distribution', {
      comment: distributionComment,
      defaultBehavior: {
        origin: new HttpOrigin(origin, {
          protocolPolicy: OriginProtocolPolicy.HTTP_ONLY,
          customHeaders: {
            [customSecurityHeader]: customSecurityHeaderValue,
          },
        }),
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachedMethods: CachedMethods.CACHE_GET_HEAD_OPTIONS,
        allowedMethods: AllowedMethods.ALLOW_ALL,
        cachePolicy,
      },
      enableIpv6: true,
      enabled: true,
    });

    // Ensure distribution is destroyed when stack is deleted
    distribution.applyRemovalPolicy(RemovalPolicy.DESTROY);

    this.ideUrl = `https://${distribution.distributionDomainName}/?folder=%2Fhome%2Fec2-user%2Fworkshop`;
    this.healthCheckEndpoint = `https://${distribution.distributionDomainName}/healthz`;

    NagSuppressions.addResourceSuppressions(distribution, [
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
          "Using default SSL settings for this distribution, it's for a short-lived workshop.",
      },
    ]);
  }
}
