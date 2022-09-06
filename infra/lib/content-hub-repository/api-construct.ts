import { Construct } from "constructs";
import { Function } from "aws-cdk-lib/aws-lambda";
import {
  CorsHttpMethod,
  HttpApi,
  HttpMethod,
} from "@aws-cdk/aws-apigatewayv2-alpha";
import { HttpUserPoolAuthorizer } from "@aws-cdk/aws-apigatewayv2-authorizers-alpha";
import { HttpLambdaIntegration } from "@aws-cdk/aws-apigatewayv2-integrations-alpha";
import { CfnOutput, Duration, Fn } from "aws-cdk-lib";
import { IUserPool, IUserPoolClient } from "aws-cdk-lib/aws-cognito";

class ApiConstructProps {
  getPresignedUrlFn: Function;
  userPool: IUserPool;
  userPoolClient: IUserPoolClient;
}

export class ApiConstruct extends Construct {
  public readonly api: HttpApi;
  public readonly domain: string;

  constructor(scope: Construct, id: string, props: ApiConstructProps) {
    super(scope, id);

    const { getPresignedUrlFn, userPool, userPoolClient } = props;

    const authorizer = new HttpUserPoolAuthorizer("userpool-auth", userPool, {
      userPoolClients: [userPoolClient],
    });

    this.api = new HttpApi(this, "http-api", {
      defaultAuthorizer: authorizer,
      createDefaultStage: true,
      corsPreflight: {
        allowHeaders: ["Authorization"],
        allowMethods: [CorsHttpMethod.GET, CorsHttpMethod.OPTIONS],
        allowOrigins: ["*"],
        exposeHeaders: ["Date", "x-api-id"],
        maxAge: Duration.days(10),
      },
    });

    this.api.addRoutes({
      path: "/api/get-presigned-url",
      methods: [HttpMethod.GET],
      integration: new HttpLambdaIntegration(
        "get-presigned-url",
        getPresignedUrlFn
      ),
    });

    this.domain = Fn.select(2, Fn.split("/", this.api.url as string));

    new CfnOutput(this, "ApiEndpoint", {
      value: this.domain,
    });
  }
}
