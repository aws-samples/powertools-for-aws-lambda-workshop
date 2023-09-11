import {BundlingOutput, Stack, StackProps} from 'aws-cdk-lib';
import {Construct} from 'constructs';
import {Code, Function, Runtime} from 'aws-cdk-lib/aws-lambda';
import {NagSuppressions} from 'cdk-nag';
import {
    commonEnvVars,
    commonJavaFunctionSettings,
    dynamoFilesTableName,
    environment,
    landingZoneBucketNamePrefix, powertoolsLoggerLogLevel,
} from '../constants';
import * as os from 'os';

interface FunctionsConstructProps extends StackProps {}

export class FunctionsConstruct extends Construct {
  public readonly thumbnailGeneratorFn: Function;

  public constructor(
    scope: Construct,
    id: string,
    props: FunctionsConstructProps
  ) {
    super(scope, id);

    const localEnvVars = {
      ...commonEnvVars,
      AWS_ACCOUNT_ID: Stack.of(this).account,
      TABLE_NAME_FILES: dynamoFilesTableName,
      BUCKET_NAME_FILES: `${landingZoneBucketNamePrefix}-${
        Stack.of(this).account
      }-${environment}`,
    };

    this.thumbnailGeneratorFn = new Function(
      this,
      'thumbnail-generator',
      {
        ...commonJavaFunctionSettings,
        runtime: Runtime.JAVA_17,
        functionName: `thumbnail-generator-${environment}`,
        environment: {
          ...localEnvVars,
            POWERTOOLS_LOG_LEVEL: powertoolsLoggerLogLevel // different from typescript
        },
        code: Code.fromAsset("../functions/java/modules/module1/", {
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
        handler: 'com.amazonaws.powertools.workshop.Module1Handler',
      }
    );

    NagSuppressions.addResourceSuppressions(
      this.thumbnailGeneratorFn,
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
        return ["/bin/sh", "-c", "mvn package && cp /asset-input/target/thumbnail-generator.jar /asset-output/"];
    }
}
