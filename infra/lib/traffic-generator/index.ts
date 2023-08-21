import { CustomResource, Duration, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Provider } from 'aws-cdk-lib/custom-resources';
import { Rule, Schedule } from 'aws-cdk-lib/aws-events';
import { LambdaFunction } from 'aws-cdk-lib/aws-events-targets';
import { FunctionsConstruct } from './functions-construct';

import { trafficGeneratorIntervalInMinutes } from './../constants';

export class TrafficGenerator extends Construct {
  public readonly functions: FunctionsConstruct;

  public constructor(scope: Construct, id: string, _props: StackProps) {
    super(scope, id);

    this.functions = new FunctionsConstruct(this, 'functions-construct', {});

    const cronRule = new Rule(this, 'traffic-generator-cron', {
      schedule: Schedule.rate(
        Duration.minutes(trafficGeneratorIntervalInMinutes)
      ),
      enabled: false,
    });
    cronRule.addTarget(new LambdaFunction(this.functions.trafficGeneratorFn));

    const provider = new Provider(this, 'DummyUsersProvider', {
      onEventHandler: this.functions.usersGeneratorFn,
      logRetention: RetentionDays.ONE_DAY,
    });

    new CustomResource(this, 'Custom:DummyUsers', {
      serviceToken: provider.serviceToken,
    });
  }
}
