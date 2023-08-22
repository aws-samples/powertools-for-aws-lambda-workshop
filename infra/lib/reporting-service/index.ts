import { Construct } from 'constructs';
import { FunctionsConstruct } from './functions-construct';
import { ApiConstruct } from './api-construct';
import {
  AuthorizationType,
  LambdaIntegration,
} from 'aws-cdk-lib/aws-apigateway';

interface ReportingServiceProps {}

export class ReportingService extends Construct {
  public readonly functions: FunctionsConstruct;
  public readonly api: ApiConstruct;

  public constructor(
    scope: Construct,
    id: string,
    _props: ReportingServiceProps
  ) {
    super(scope, id);

    this.functions = new FunctionsConstruct(this, 'functions-construct', {});

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
