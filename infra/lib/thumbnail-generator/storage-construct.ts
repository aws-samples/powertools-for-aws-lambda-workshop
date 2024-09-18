import { RemovalPolicy } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Table, AttributeType, BillingMode } from 'aws-cdk-lib/aws-dynamodb';
import { environment } from '../constants.js';
import { IGrantable } from 'aws-cdk-lib/aws-iam';
import { NagSuppressions } from 'cdk-nag';

interface StorageConstructProps {}

export class StorageConstruct extends Construct {
  public readonly idempotencyTable: Table;

  public constructor(
    scope: Construct,
    id: string,
    _props: StorageConstructProps
  ) {
    super(scope, id);

    this.idempotencyTable = new Table(this, 'idempotency-table', {
      tableName: `idempotency-thumbnail-generator-${environment}`,
      billingMode: BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: 'id', type: AttributeType.STRING },
      timeToLiveAttribute: 'expiration',
      removalPolicy: RemovalPolicy.DESTROY,
    });

    NagSuppressions.addResourceSuppressions(this.idempotencyTable, [
      {
        id: 'AwsSolutions-DDB3',
        reason:
          "No point-in-time recovery needed for this table, it's for a short-lived workshop.",
      },
    ]);
  }

  public grantReadDataOnTable(grantee: IGrantable): void {
    this.idempotencyTable.grantReadData(grantee);
  }

  public grantReadWriteDataOnTable(grantee: IGrantable): void {
    this.idempotencyTable.grantReadWriteData(grantee);
  }

  public grantWriteDataOnTable(grantee: IGrantable): void {
    this.idempotencyTable.grantWriteData(grantee);
  }
}
