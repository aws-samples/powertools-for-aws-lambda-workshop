import { Stack, StackProps, CfnOutput, Duration } from "aws-cdk-lib";
import { Construct } from "constructs";
import { Frontend } from "./frontend";
import { ContentHubRepo } from "./content-hub-repository";
import { ImageProcessing } from "./image-processing";
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

    const trafficGenerator = new TrafficGenerator(
      this,
      "traffic-generator",
      {}
    );
    trafficGenerator.functions.trafficGeneratorFn.addEnvironment(
      "COGNITO_USER_POOL_ID",
      frontend.auth.userPool.userPoolId
    );
    trafficGenerator.functions.trafficGeneratorFn.addEnvironment(
      "COGNITO_USER_POOL_CLIENT_ID",
      frontend.auth.userPoolClient.userPoolClientId
    );
    frontend.auth.userPool.grant(
      trafficGenerator.functions.trafficGeneratorFn,
      "cognito-idp:AdminInitiateAuth"
    );

    /* loadTestFunction.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["cognito-idp:AdminInitiateAuth"],
        resources: [frontend.auth.userPool.userPoolArn],
      })
    ); */

    new CfnOutput(this, "AWSRegion", {
      value: Stack.of(this).region,
    });
  }
}
