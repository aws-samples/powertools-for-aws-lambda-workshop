import { Stack, StackProps, CfnOutput, Duration } from "aws-cdk-lib";
import { Construct } from "constructs";
import { Frontend } from "./frontend";
import { ContentHubRepo } from "./content-hub-repository";
import { ImageProcessing } from "./image-processing";
import { VideoProcessing } from "./video-processing";
import { TrafficGenerator } from "./traffic-generator";
import { landingZoneBucketNamePrefix, environment } from "./constants";

export class InfraStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const landingZoneBucketName = `${landingZoneBucketNamePrefix}-${
      Stack.of(this).account
    }-${environment}`;

    const frontend = new Frontend(this, "frontend", {});

    const contentHubRepo = new ContentHubRepo(this, "content-hub-repo", {
      userPool: frontend.auth.userPool,
      userPoolClient: frontend.auth.userPoolClient,
      landingZoneBucketName,
    });
    frontend.addApiBehavior(contentHubRepo.api.domain);

    const imageProcessing = new ImageProcessing(this, "image-processing", {
      landingZoneBucketName,
    });
    contentHubRepo.storage.grantReadWrite(
      imageProcessing.functions.resizeImageFn
    );
    contentHubRepo.storage.grantReadWriteDataOnTable(
      imageProcessing.functions.resizeImageFn
    );

    const videoProcessing = new VideoProcessing(this, "video-processing", {
      landingZoneBucketName,
    });
    contentHubRepo.storage.grantReadWrite(
      videoProcessing.functions.resizeVideoFn
    );
    contentHubRepo.storage.grantReadWriteDataOnTable(
      videoProcessing.functions.resizeVideoFn
    );

    const trafficGenerator = new TrafficGenerator(
      this,
      "traffic-generator",
      {}
    );
    trafficGenerator.functions.usersGeneratorFn.addEnvironment(
      "COGNITO_USER_POOL_CLIENT_ID",
      frontend.auth.userPoolClient.userPoolClientId
    );

    trafficGenerator.functions.trafficGeneratorFn.addEnvironment(
      "COGNITO_USER_POOL_ID",
      frontend.auth.userPool.userPoolId
    );
    trafficGenerator.functions.trafficGeneratorFn.addEnvironment(
      "COGNITO_USER_POOL_CLIENT_ID",
      frontend.auth.userPoolClient.userPoolClientId
    );
    trafficGenerator.functions.trafficGeneratorFn.addEnvironment(
      "API_URL",
      `https://${frontend.cdn.distribution.distributionDomainName}/api`
    );
    frontend.auth.userPool.grant(
      trafficGenerator.functions.trafficGeneratorFn,
      "cognito-idp:AdminInitiateAuth"
    );

    new CfnOutput(this, "AWSRegion", {
      value: Stack.of(this).region,
    });
  }
}
