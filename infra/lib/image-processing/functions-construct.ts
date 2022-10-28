import { StackProps, Duration, Stack, RemovalPolicy } from "aws-cdk-lib";
import { Construct } from "constructs";
import { Code, Tracing, Runtime, LayerVersion } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import {
  dynamoFilesTableName,
  powertoolsServiceName,
  powertoolsLoggerLogLevel,
  powertoolsLoggerSampleRate,
  powertoolsMetricsNamespace,
  environment,
} from "../constants";

interface FunctionsConstructProps extends StackProps {
  landingZoneBucketName: string;
}

export class FunctionsConstruct extends Construct {
  public readonly resizeImageFn: NodejsFunction;

  constructor(scope: Construct, id: string, props: FunctionsConstructProps) {
    super(scope, id);

    const sharedSettings = {
      runtime: Runtime.NODEJS_16_X,
      tracing: Tracing.ACTIVE,
      timeout: Duration.seconds(30),
      handler: "handler",
      memorySize: 256,
    };

    const commonEnvVars = {
      ENVIRONMENT: environment,
      AWS_ACCOUNT_ID: Stack.of(this).account,
      // Powertools environment variables
      POWERTOOLS_SERVICE_NAME: powertoolsServiceName,
      POWERTOOLS_LOGGER_LOG_LEVEL: powertoolsLoggerLogLevel,
      POWERTOOLS_LOGGER_SAMPLE_RATE: powertoolsLoggerSampleRate,
      POWERTOOLS_METRICS_NAMESPACE: powertoolsMetricsNamespace,
    };

    const sharpLayer = new LayerVersion(this, "powertools-layer", {
      compatibleRuntimes: [Runtime.NODEJS_16_X],
      code: Code.fromAsset("../layers/sharp"),
      description: "Bundles Sharp lib for image processing",
      removalPolicy: RemovalPolicy.DESTROY,
    });

    this.resizeImageFn = new NodejsFunction(this, "resize-image", {
      entry: "../functions/resize-image.ts",
      functionName: `resize-image-${environment}`,
      ...sharedSettings,
      environment: {
        TABLE_NAME_FILES: dynamoFilesTableName,
        BUCKET_NAME_FILES: props.landingZoneBucketName,
        ...commonEnvVars,
      },
      layers: [sharpLayer],
      bundling: {
        externalModules: ["sharp"],
      },
    });
  }
}
