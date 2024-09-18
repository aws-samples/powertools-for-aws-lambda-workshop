import { StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { DashboardConstruct } from './dashboard-construct.js';

interface MonitoringConstructProps extends StackProps {
  tableName: string;
  functionName: string;
  deadLetterQueueName: string;
}

export class MonitoringConstruct extends Construct {
  public readonly imageProcessingDashboard: DashboardConstruct;

  public constructor(
    scope: Construct,
    id: string,
    props: MonitoringConstructProps
  ) {
    super(scope, id);

    this.imageProcessingDashboard = new DashboardConstruct(
      this,
      'dashboard-construct',
      props
    );
  }
}
