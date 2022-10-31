import { Expiration } from "aws-cdk-lib";
import { Construct } from "constructs";
import { Function } from "aws-cdk-lib/aws-lambda";
import {
  CorsHttpMethod,
  HttpApi,
  HttpMethod,
} from "@aws-cdk/aws-apigatewayv2-alpha";
import { HttpUserPoolAuthorizer } from "@aws-cdk/aws-apigatewayv2-authorizers-alpha";
import { HttpLambdaIntegration } from "@aws-cdk/aws-apigatewayv2-integrations-alpha";
import {
  GraphqlApi,
  Schema,
  AuthorizationType,
  ObjectType,
  GraphqlType,
  InputType,
  Directive,
  ResolvableField,
  // MappingTemplate,
} from "@aws-cdk/aws-appsync-alpha";
import { CfnOutput, Duration, Fn } from "aws-cdk-lib";
import { IUserPool, IUserPoolClient } from "aws-cdk-lib/aws-cognito";
import { environment } from "../constants";
import { Table } from "aws-cdk-lib/aws-dynamodb";

class ApiConstructProps {
  getPresignedUrlFn: Function;
  userPool: IUserPool;
  userPoolClient: IUserPoolClient;
  table: Table;
}

export class ApiConstruct extends Construct {
  public readonly api: HttpApi;
  public readonly domain: string;
  public readonly api2: GraphqlApi; // This variable name is temporary

  constructor(scope: Construct, id: string, props: ApiConstructProps) {
    super(scope, id);

    const { getPresignedUrlFn, userPool, userPoolClient, table } = props;

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

    /* const schema = new Schema();
    const fileType = new ObjectType("file", {
      definition: {
        id: GraphqlType.id(),
        updatedAt: GraphqlType.awsDateTime({ isRequired: true }),
        status: GraphqlType.string({ isRequired: true }),
      },
      directives: [Directive.iam(), Directive.cognito()],
    })
    schema.addType(fileType);
    const fileInput = new InputType("fileInput", {
      definition: {
        id: GraphqlType.id(),
        updatedAt: GraphqlType.awsDateTime({ isRequired: true }),
        status: GraphqlType.string({ isRequired: true }),
      },
    })
    schema.addType(fileInput);

    schema.addMutation('updateFileStatus', new ResolvableField({
      returnType: fileType.attribute(),
      args: {
        input: fileInput.attribute()
      }
    })) */

    /* this.api2 = new GraphqlApi(this, "graphql-api", {
      name: `API-${environment}`,
      schema,
      authorizationConfig: {
        defaultAuthorization: {
          // For development only, will revisit this and remove API_KEY auth
          authorizationType: AuthorizationType.API_KEY,
          apiKeyConfig: {
            expires: Expiration.after(Duration.days(365)),
          },
        },
        additionalAuthorizationModes: [
          {
            authorizationType: AuthorizationType.IAM,
          },
          {
            authorizationType: AuthorizationType.USER_POOL,
            userPoolConfig: {
              userPool,
            },
          },
        ],
      },
    }); */

    /* const filesTableDS = this.api2.addDynamoDbDataSource("files-table", table);
    filesTableDS.createResolver({
      typeName: "Mutation",
      fieldName: "getPresignedUrl",

    }); */

    /* new CfnOutput(this, "ApiUrl", {
      value: this.api2.graphqlUrl,
    });

    new CfnOutput(this, "ApiId", {
      value: this.api2.apiId,
    });

    new CfnOutput(this, "ApiKey", {
      value: this.api2.apiKey as string,
    });
    */
  }
}
