import { StackProps, RemovalPolicy } from "aws-cdk-lib";
import { Construct } from "constructs";
import {
  Table,
  AttributeType,
  BillingMode,
  ProjectionType,
} from "aws-cdk-lib/aws-dynamodb";
import { dynamoFilesTableName, dynamoFilesGsiName } from "./constants";

export class StorageConstruct extends Construct {
  public readonly filesTable: Table;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id);

    const commonTableSettings = {
      billingMode: BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: "id", type: AttributeType.STRING },
      removalPolicy: RemovalPolicy.DESTROY,
    };

    /* const commonGsiSettings = {
      partitionKey: { name: "isDisplayed", type: AttributeType.STRING },
      sortKey: { name: "displayedFrom", type: AttributeType.NUMBER },
      projectionType: ProjectionType.ALL,
    }; */

    this.filesTable = new Table(this, "files-table", {
      tableName: dynamoFilesTableName,
      ...commonTableSettings,
    });
    /* this.filesTable.addGlobalSecondaryIndex({
      indexName: dynamoFilesGsiName,
      ...commonGsiSettings,
    }); */
  }
}
