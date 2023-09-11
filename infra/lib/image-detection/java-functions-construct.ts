import {StackProps, Stack, BundlingOutput} from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {Code, Function, Runtime} from 'aws-cdk-lib/aws-lambda';
import { NagSuppressions } from 'cdk-nag';
import {
  commonJavaFunctionSettings,
  commonEnvVars,
  dynamoFilesTableName,
  environment, powertoolsLoggerLogLevel,
} from '../constants';
import * as os from 'os';

interface FunctionsConstructProps extends StackProps {
  landingZoneBucketName: string;
}

export class FunctionsConstruct extends Construct {
  public readonly imageDetectionFn: Function;

  public constructor(
    scope: Construct,
    id: string,
    props: FunctionsConstructProps
  ) {
    super(scope, id);

    const localEnvVars = {
      ...commonEnvVars,
      AWS_ACCOUNT_ID: Stack.of(this).account,
    };

    this.imageDetectionFn = new Function(this, 'image-detection', {
      ...commonJavaFunctionSettings,
      runtime: Runtime.JAVA_17,
      functionName: `image-detection-${environment}`,
      environment: {
        ...localEnvVars,
        TABLE_NAME_FILES: dynamoFilesTableName,
        BUCKET_NAME_FILES: props.landingZoneBucketName,
        POWERTOOLS_LOG_LEVEL: powertoolsLoggerLogLevel // different from typescript
      },
      code: Code.fromAsset("../functions/java/modules/module2/", {
        bundling: {
          image: Runtime.JAVA_17.bundlingImage,
          command: this.getFunctionPackageCommand(),
          user: 'root',
          outputType: BundlingOutput.ARCHIVED,
          volumes: [
            {
              hostPath: `${os.homedir()}/.m2'`,
              containerPath: '/root/.m2/'
            }
          ]
        }
      }),
      handler: 'com.amazonaws.powertools.workshop.Module2Handler',
    });

    NagSuppressions.addResourceSuppressions(
      this.imageDetectionFn,
      [
        {
          id: 'AwsSolutions-IAM4',
          reason:
            'Intentionally using AWSLambdaBasicExecutionRole managed policy.',
        },
        {
          id: 'AwsSolutions-IAM5',
          reason:
            'Wildcard needed to allow access to X-Ray and CloudWatch streams.',
        },
      ],
      true
    );
  }

  private getFunctionPackageCommand() {
    return ["/bin/sh", "-c", "mvn package && cp /asset-input/target/image-detection.jar /asset-output/"];
  }
}
