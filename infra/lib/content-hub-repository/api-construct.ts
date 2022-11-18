import { Construct } from 'constructs';
import { Function } from 'aws-cdk-lib/aws-lambda';
import {
  GraphqlApi,
  Schema,
  AuthorizationType,
  MappingTemplate,
} from '@aws-cdk/aws-appsync-alpha';
import { CfnOutput, Fn } from 'aws-cdk-lib';
import { IUserPool } from 'aws-cdk-lib/aws-cognito';
import { environment } from '../constants';
import { Table } from 'aws-cdk-lib/aws-dynamodb';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';

class ApiConstructProps {
  getPresignedUploadUrlFn: Function;
  getPresignedDownloadUrlFn: Function;
  userPool: IUserPool;
  table: Table;
}

export class ApiConstruct extends Construct {
  public readonly api: GraphqlApi;
  public readonly domain: string;

  constructor(scope: Construct, id: string, props: ApiConstructProps) {
    super(scope, id);

    const {
      getPresignedUploadUrlFn,
      getPresignedDownloadUrlFn,
      userPool,
      table,
    } = props;

    this.api = new GraphqlApi(this, 'graphql-api', {
      name: `API-${environment}`,
      schema: Schema.fromAsset('./lib/content-hub-repository/schema.graphql'),
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
    this.domain = Fn.select(2, Fn.split('/', this.api.graphqlUrl as string));
    const filesTableDS = this.api.addDynamoDbDataSource('files-table', table);
    const lambdaPresignedUploadDS = this.api.addLambdaDataSource(
      'lambda-get-presigned-download-url',
      getPresignedUploadUrlFn
    );
    const lambdaPresignedDownloadDS = this.api.addLambdaDataSource(
      'lambda-get-presigned-upload-url',
      getPresignedDownloadUrlFn
    );
    const noneDS = this.api.addNoneDataSource('local-none');

    filesTableDS.createResolver({
      typeName: 'Mutation',
      fieldName: 'updateFileStatus',
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

    lambdaPresignedUploadDS.createResolver({
      typeName: 'Mutation',
      fieldName: 'generatePresignedUploadUrl',
      requestMappingTemplate: MappingTemplate.lambdaRequest(),
      responseMappingTemplate: MappingTemplate.lambdaResult(),
    });

    lambdaPresignedDownloadDS.createResolver({
      typeName: 'Query',
      fieldName: 'generatePresignedDownloadUrl',
      requestMappingTemplate: MappingTemplate.lambdaRequest(),
      responseMappingTemplate: MappingTemplate.lambdaResult(),
    });

    noneDS.createResolver({
      typeName: 'Subscription',
      fieldName: 'onUpdateFileStatus',
      requestMappingTemplate:
        MappingTemplate.fromString(`## [Start] Subscription Request template. **
        $util.toJson({
          "version": "2018-05-29",
          "payload": {}
        })
        ## [End] Subscription Request template. **`),
      responseMappingTemplate:
        MappingTemplate.fromString(`## [Start] Subscription Response template. **
        #if( !$util.isNullOrEmpty($ctx.args.filter) )
        $extensions.setSubscriptionFilter($util.transform.toSubscriptionFilter($ctx.args.filter))
        #end
        $util.toJson(null)
        ## [End] Subscription Response template. **`),
    });

    new CfnOutput(this, 'ApiEndpoint', {
      value: this.domain,
    });

    new CfnOutput(this, 'ApiUrl', {
      value: this.api.graphqlUrl,
    });

    new CfnOutput(this, 'ApiId', {
      value: this.api.apiId,
    });
  }
}
