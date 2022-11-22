import { StackProps, Duration, Stack, RemovalPolicy } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Code, LayerVersion } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { NagSuppressions } from 'cdk-nag';
import {
  commonFunctionSettings,
  commonBundlingSettings,
  commonEnvVars,
  dynamoFilesTableName,
  environment,
} from '../constants';

interface FunctionsConstructProps extends StackProps {
  landingZoneBucketName: string
  videoProcessingTimeout: Duration
}

export class FunctionsConstruct extends Construct {
  public readonly resizeVideoFn: NodejsFunction;

  public constructor(scope: Construct, id: string, props: FunctionsConstructProps) {
    super(scope, id);

    const { videoProcessingTimeout } = props;

    const localEnvVars = {
      ...commonEnvVars,
      AWS_ACCOUNT_ID: Stack.of(this).account,
    };

    const ffmpegLayer = new LayerVersion(this, 'ffmpeg-layer', {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      compatibleRuntimes: [commonFunctionSettings.runtime!],
      code: Code.fromAsset('../layers/ffmpeg'),
      description: 'Bundles ffmpeg lib for video processing',
      removalPolicy: RemovalPolicy.DESTROY,
    });

    this.resizeVideoFn = new NodejsFunction(this, 'process-video', {
      ...commonFunctionSettings,
      entry: '../functions/process-video.ts',
      functionName: `process-video-${environment}`,
      memorySize: 4096,
      timeout: videoProcessingTimeout,
      environment: {
        ...localEnvVars,
        TABLE_NAME_FILES: dynamoFilesTableName,
        BUCKET_NAME_FILES: props.landingZoneBucketName,
        FFMPEG_PATH: '/opt/bin/ffmpeg',
      },
      layers: [ffmpegLayer],
      bundling: {
        ...commonBundlingSettings,
        externalModules: ['fluent-ffmpeg'],
      },
    });

    NagSuppressions.addResourceSuppressions(this.resizeVideoFn, [
      {
        id: 'AwsSolutions-IAM4',
        reason:
          'Intentionally using AWSLambdaBasicExecutionRole managed policy.',
      },
      {
        id: 'AwsSolutions-IAM5',
        reason: 'Wildcard needed to allow access to X-Ray and CloudWatch streams.',
      },
      {
        id: 'AwsSolutions-L1',
        reason: 'Using Nodejs16 intentionally. Latest version not yet tested with Powertools'
      }
    ], true);

  }
}
