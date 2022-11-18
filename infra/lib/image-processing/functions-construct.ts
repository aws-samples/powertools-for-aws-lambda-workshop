import { StackProps, Stack, RemovalPolicy } from "aws-cdk-lib";
import { Construct } from "constructs";
import { Code, LayerVersion } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { aws_ssm as ssm } from "aws-cdk-lib";
import {
  commonFunctionSettings,
  commonBundlingSettings,
  commonEnvVars,
  dynamoFilesTableName,
  environment,
} from "../constants";

interface FunctionsConstructProps extends StackProps {
  landingZoneBucketName: string;
}

export class FunctionsConstruct extends Construct {
  public readonly resizeImageFn: NodejsFunction;

  constructor(scope: Construct, id: string, props: FunctionsConstructProps) {
    super(scope, id);

    const localEnvVars = {
      ...commonEnvVars,
      AWS_ACCOUNT_ID: Stack.of(this).account,
    };

    const sharpLayer = new LayerVersion(this, "sharp-layer", {
      compatibleRuntimes: [commonFunctionSettings.runtime!],
      code: Code.fromAsset("../layers/sharp"),
      description: "Bundles Sharp lib for image processing",
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const failureLambdaParameter = new ssm.StringParameter(this, `/failure-lambda/${environment}/process-image`, {
          stringValue: '{"isEnabled": false, "failureMode": "latency", "rate": 1, "minLatency": 300, "maxLatency": 1000, "exceptionMsg": "Exception message!", "statusCode": 404, "diskSpace": 100, "denylist": ["s3.*.amazonaws.com", "dynamodb.*.amazonaws.com"]}',
        }
    );

    this.resizeImageFn = new NodejsFunction(this, "process-image", {
      ...commonFunctionSettings,
      entry: "../functions/process-image.ts",
      functionName: `process-image-${environment}`,
      environment: {
        ...localEnvVars,
        TABLE_NAME_FILES: dynamoFilesTableName,
        BUCKET_NAME_FILES: props.landingZoneBucketName,
        FAILURE_INJECTION_PARAM: failureLambdaParameter.parameterName
      },
      layers: [sharpLayer],
      bundling: {
        ...commonBundlingSettings,
        externalModules: ["sharp"],
      },
    });

    failureLambdaParameter.grantRead(this.resizeImageFn);
  }
}
