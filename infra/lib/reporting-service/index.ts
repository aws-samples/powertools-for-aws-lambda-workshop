import { Construct } from 'constructs';
import { FunctionsConstruct } from './functions-construct.js';
import { ApiConstruct } from './api-construct.js';
import { LambdaIntegration } from 'aws-cdk-lib/aws-apigateway';
import { type StackProps } from 'aws-cdk-lib';
import { type Language } from '../constants.js';
import { NagSuppressions } from 'cdk-nag';

interface ReportingServiceProps extends StackProps {
  language: Language;
}

export class ReportingService extends Construct {
  public readonly functions: FunctionsConstruct;
  public readonly api: ApiConstruct;

  public constructor(
    scope: Construct,
    id: string,
    props: ReportingServiceProps
  ) {
    super(scope, id);

    const { language } = props;

    this.functions = new FunctionsConstruct(this, 'functions-construct', {
      language,
    });

    this.api = new ApiConstruct(this, 'api-construct', {});

    const methodResource = this.api.restApi.root.addMethod(
      'POST',
      new LambdaIntegration(this.functions.apiEndpointHandlerFn, {
        proxy: true,
      }),
      {
        apiKeyRequired: true,
      }
    );

    NagSuppressions.addResourceSuppressions(
      methodResource,
      [
        {
          id: 'AwsSolutions-COG4',
          reason: 'Method uses API Key Authorization instead',
        },
        {
          id: 'AwsSolutions-APIG4',
          reason: 'Method uses API Key Authorization',
        },
      ],
      true
    );
  }
}
