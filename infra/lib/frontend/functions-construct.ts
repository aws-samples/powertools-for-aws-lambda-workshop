import { StackProps, Duration, Stack } from "aws-cdk-lib";
import { Construct } from "constructs";
import { Runtime, Function, Code } from "aws-cdk-lib/aws-lambda";
import { environment } from "../constants";

interface FunctionsConstructProps extends StackProps {}

export class FunctionsConstruct extends Construct {
  public readonly preSignUpCognitoTriggerFn: Function;

  constructor(scope: Construct, id: string, props: FunctionsConstructProps) {
    super(scope, id);

    const sharedSettings = {
      runtime: Runtime.NODEJS_16_X,
      timeout: Duration.seconds(5),
      memorySize: 128,
    };
    this.preSignUpCognitoTriggerFn = new Function(
      this,
      "pre-signup-cognito-trigger",
      {
        ...sharedSettings,
        functionName: `preSignUpCognitoTriggerFn-${environment}`,
        code: Code.fromInline(
          `exports.handler = (event, _context, callback) => {event.response.autoConfirmUser=true;event.response.autoVerifyEmail=true;callback(null, event);};`
        ),
        handler: "index.handler",
      }
    );
  }
}
