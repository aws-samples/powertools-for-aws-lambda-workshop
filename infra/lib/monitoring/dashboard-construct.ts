import { Construct } from 'constructs';
import { CfnDashboard } from 'aws-cdk-lib/aws-cloudwatch';
import { dashboardContent } from './dashboard-content';

export class DashboardConstruct extends Construct {
  public readonly dashboard: CfnDashboard;

  public constructor(scope: Construct, id: string) {
    super(scope, id);

    this.dashboard = new CfnDashboard(this, id, {
      dashboardBody: JSON.stringify(dashboardContent),
      dashboardName: id,
    });

  }
}
