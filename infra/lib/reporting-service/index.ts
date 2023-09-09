import { Construct } from 'constructs';
import { FunctionsConstruct } from './functions-construct';
import { ApiConstruct } from './api-construct';
import { LambdaIntegration } from 'aws-cdk-lib/aws-apigateway';
import { type StackProps } from 'aws-cdk-lib';
import { type Language } from '../constants';

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

    this.api.restApi.root.addMethod(
      'POST',
      new LambdaIntegration(this.functions.apiEndpointHandlerFn, {
        proxy: true,
      }),
      {
        apiKeyRequired: true,
      }
    );
  }
}
