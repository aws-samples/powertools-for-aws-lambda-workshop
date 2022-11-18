import { StackProps, Duration, Stack, RemovalPolicy } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Code, LayerVersion } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';

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

  constructor(scope: Construct, id: string, props: FunctionsConstructProps) {
    super(scope, id);

    const { videoProcessingTimeout } = props;

    const localEnvVars = {
      ...commonEnvVars,
      AWS_ACCOUNT_ID: Stack.of(this).account,
    };

    const ffmpegLayer = new LayerVersion(this, 'ffmpeg-layer', {
      compatibleRuntimes: [commonFunctionSettings.runtime!],
      code: Code.fromAsset('../layers/ffmpeg'),
      description: 'Bundles ffmpeg lib for video processing',
      removalPolicy: RemovalPolicy.DESTROY,
    });

    this.resizeVideoFn = new NodejsFunction(this, 'process-video', {
      ...commonFunctionSettings,
      entry: '../functions/process-video.ts',
      functionName: `process-video-name-${environment}`,
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

  }
}
