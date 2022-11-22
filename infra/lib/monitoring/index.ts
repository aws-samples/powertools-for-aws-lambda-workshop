import { Construct } from 'constructs';
import { DashboardConstruct } from './dashboard-construct';

export class MonitoringConstruct extends Construct {
  public readonly imageProcessingDashboard: DashboardConstruct;

  public constructor(scope: Construct, id: string) {
    super(scope, id);

    this.imageProcessingDashboard = new DashboardConstruct(this, id);
  }
}
