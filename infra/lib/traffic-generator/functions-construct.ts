import { StackProps, Duration, Stack } from "aws-cdk-lib";
import { Construct } from "constructs";
import { Tracing, Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import {
  powertoolsServiceName,
  powertoolsLoggerLogLevel,
  powertoolsLoggerSampleRate,
  powertoolsMetricsNamespace,
  environment,
  trafficGeneratorIntervalInMinutes,
} from "../constants";

interface FunctionsConstructProps extends StackProps {}

export class FunctionsConstruct extends Construct {
  public readonly trafficGeneratorFn: NodejsFunction;

  constructor(scope: Construct, id: string, props: FunctionsConstructProps) {
    super(scope, id);

    const sharedSettings = {
      runtime: Runtime.NODEJS_16_X,
      tracing: Tracing.ACTIVE,
      timeout: Duration.seconds(30),
      handler: "handler",
      bundling: {
        sourceMap: true,
        minify: true,
      },
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

    this.trafficGeneratorFn = new NodejsFunction(this, "traffic-generator", {
      entry: "../functions/traffic-generator.ts",
      functionName: `traffic-generator-${environment}`,
      ...sharedSettings,
      environment: {
        INTERVALS_IN_MINUTES: trafficGeneratorIntervalInMinutes.toString(),
        // COGNITO_USER_POOL_ID - added at deploy time
        // COGNITO_USER_POOL_CLIENT_ID - added at deploy time
        ...commonEnvVars,
      },
      timeout: Duration.seconds(900),
    });
  }
}
