import { StackProps, Stack, RemovalPolicy } from 'aws-cdk-lib';
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
  landingZoneBucketName: string;
}

export class FunctionsConstruct extends Construct {
  public readonly resizeImageFn: NodejsFunction;

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

    const sharpLayer = new LayerVersion(this, 'sharp-layer', {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      compatibleRuntimes: [commonFunctionSettings.runtime!],
      code: Code.fromAsset('../layers/sharp'),
      description: 'Bundles Sharp lib for image processing',
      removalPolicy: RemovalPolicy.DESTROY,
    });

    this.resizeImageFn = new NodejsFunction(this, 'process-image', {
      ...commonFunctionSettings,
      entry: '../functions/typescript/modules/module1/index.ts',
      functionName: `process-image-${environment}`,
      environment: {
        ...localEnvVars,
        TABLE_NAME_FILES: dynamoFilesTableName,
        BUCKET_NAME_FILES: props.landingZoneBucketName,
      },
      layers: [sharpLayer],
      bundling: {
        ...commonBundlingSettings,
        externalModules: ['sharp'],
      },
    });

    NagSuppressions.addResourceSuppressions(
      this.resizeImageFn,
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
        {
          id: 'AwsSolutions-L1',
          reason:
            'Using Nodejs16 intentionally. Latest version not yet tested with Powertools',
        },
      ],
      true
    );
  }
}
