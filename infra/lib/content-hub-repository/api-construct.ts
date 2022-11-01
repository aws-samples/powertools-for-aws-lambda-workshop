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
  MappingTemplate,
  PrimaryKey,
  Values,
} from "@aws-cdk/aws-appsync-alpha";
import { CfnOutput, Duration, Fn } from "aws-cdk-lib";
import { IUserPool, IUserPoolClient } from "aws-cdk-lib/aws-cognito";
import { environment } from "../constants";
import { Table } from "aws-cdk-lib/aws-dynamodb";
import { RetentionDays } from "aws-cdk-lib/aws-logs";

class ApiConstructProps {
  getPresignedUrlFn: Function;
  userPool: IUserPool;
  table: Table;
}

export class ApiConstruct extends Construct {
  public readonly api: GraphqlApi;
  public readonly domain: string;

  constructor(scope: Construct, id: string, props: ApiConstructProps) {
    super(scope, id);

    const { getPresignedUrlFn, userPool, table } = props;

    this.api = new GraphqlApi(this, "graphql-api", {
      name: `API-${environment}`,
      schema: Schema.fromAsset("./lib/content-hub-repository/schema.graphql"),
      authorizationConfig: {
        defaultAuthorization: {
          authorizationType: AuthorizationType.USER_POOL,
          userPoolConfig: {
            userPool,
          },
        },
        additionalAuthorizationModes: [
          {
            authorizationType: AuthorizationType.IAM,
          },
        ],
      },
      logConfig: {
        retention: RetentionDays.FIVE_DAYS,
      },
    });
    this.domain = Fn.select(2, Fn.split("/", this.api.graphqlUrl as string));
    const filesTableDS = this.api.addDynamoDbDataSource("files-table", table);
    const lambdaDS = this.api.addLambdaDataSource(
      "lambda-get-presigned-url",
      getPresignedUrlFn
    );

    filesTableDS.createResolver({
      typeName: "Mutation",
      fieldName: "updateFileStatus",
      requestMappingTemplate: MappingTemplate.fromString(`{
        "version": "2018-05-29",
        "operation" : "UpdateItem",
        "key": {
          "id": $util.dynamodb.toDynamoDBJson($ctx.args.input.id)
        },
        "update": {
          "expression": "set #status = :val",
          "expressionNames": {
            "#status": "status",
          },
          "expressionValues": {
            ":val": $util.dynamodb.toDynamoDBJson($ctx.args.input.status)
          }
        }
      }`),
      responseMappingTemplate: MappingTemplate.dynamoDbResultItem(),
    });

    lambdaDS.createResolver({
      typeName: "Mutation",
      fieldName: "generatePresignedUrl",
      requestMappingTemplate: MappingTemplate.lambdaRequest(),
      responseMappingTemplate: MappingTemplate.lambdaResult(),
    });

    new CfnOutput(this, "ApiEndpoint", {
      value: this.domain,
    });

    new CfnOutput(this, "ApiUrl", {
      value: this.api.graphqlUrl,
    });

    new CfnOutput(this, "ApiId", {
      value: this.api.apiId,
    });
  }
}
