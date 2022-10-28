import { Construct } from "constructs";
import { Rule, Schedule } from "aws-cdk-lib/aws-events";
import { LambdaFunction } from "aws-cdk-lib/aws-events-targets";
import { FunctionsConstruct } from "./functions-construct";
import { trafficGeneratorIntervalInMinutes } from "./../constants";

class TrafficGeneratorProps {}

export class TrafficGenerator extends Construct {
  public readonly functions: FunctionsConstruct;

  constructor(scope: Construct, id: string, props: TrafficGeneratorProps) {
    super(scope, id);

    this.functions = new FunctionsConstruct(this, "functions-construct", {});

    const cronRule = new Rule(this, "traffic-generator-cron", {
      schedule: Schedule.expression(
        `cron(0/${trafficGeneratorIntervalInMinutes}' * * * ? *)`
      ),
    });
    cronRule.addTarget(new LambdaFunction(this.functions.trafficGeneratorFn));
  }
}
