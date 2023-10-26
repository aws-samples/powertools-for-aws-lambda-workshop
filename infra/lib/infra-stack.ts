import { Stack, StackProps, CfnOutput } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { AttendantIde } from './attendant-ide';
import { powertoolsServiceName, environment, Language } from './constants';

export class InfraStack extends Stack {
  public constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const language = (process.env.LANGUAGE || 'nodejs') as Language;

    new AttendantIde(this, 'attendant-ide', {});
  }
}
