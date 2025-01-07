import { CfnOutput, RemovalPolicy, Duration } from 'aws-cdk-lib';
import type { StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import type { IRole } from 'aws-cdk-lib/aws-iam';
import {
  AccountRecovery,
  UserPool,
  UserPoolClient,
  VerificationEmailStyle,
} from 'aws-cdk-lib/aws-cognito';
import type { IUserPoolClient } from 'aws-cdk-lib/aws-cognito';
import {
  IdentityPool,
  UserPoolAuthenticationProvider,
} from '@aws-cdk/aws-cognito-identitypool-alpha';
import { Code, Function, Runtime } from 'aws-cdk-lib/aws-lambda';
import { NagSuppressions } from 'cdk-nag';
import { environment } from '../constants.js';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';

interface AuthConstructProps extends StackProps {}

export class AuthConstruct extends Construct {
  public readonly authRole: IRole;
  public readonly unauthRole: IRole;
  public readonly userPool: UserPool;
  public readonly userPoolClient: IUserPoolClient;

  public constructor(scope: Construct, id: string, props: AuthConstructProps) {
    super(scope, id);

    const preSignUpCognitoTriggerFn = new Function(
      this,
      'pre-signup-cognito-trigger',
      {
        runtime: Runtime.NODEJS_22_X,
        handler: 'index.handler',
        code: Code.fromInline(`module.exports.handler = (event, context, callback) => {
        event.response.autoConfirmUser = true;
        event.response.autoVerifyEmail = true;
        callback(null, event);
      }`),
        logRetention: RetentionDays.ONE_DAY,
        timeout: Duration.seconds(5),
      }
    );

    NagSuppressions.addResourceSuppressions(preSignUpCognitoTriggerFn, [
      {
        id: 'AwsSolutions-IAM4',
        reason:
          'This is an inline function that only marks dummy users created during deploy as verified, so we want to use managed policies',
      },
    ]);

    this.userPool = new UserPool(this, 'user-pool', {
      userPoolName: `frontend-auth-${environment}`,
      selfSignUpEnabled: true,
      accountRecovery: AccountRecovery.EMAIL_ONLY,
      userVerification: {
        emailStyle: VerificationEmailStyle.CODE,
      },
      autoVerify: {
        email: true,
      },
      standardAttributes: {
        email: {
          required: true,
          mutable: true,
        },
      },
      signInAliases: {
        email: true,
        username: false,
      },
      removalPolicy: RemovalPolicy.DESTROY,
      lambdaTriggers: {
        preSignUp: preSignUpCognitoTriggerFn,
      },
    });

    NagSuppressions.addResourceSuppressions(this.userPool, [
      {
        id: 'AwsSolutions-COG1',
        reason:
          'The default for this construct already sets a strict password policy',
      },
      {
        id: 'AwsSolutions-COG2',
        reason:
          'This is a demo app, so we want to allow users to sign up easily (no MFA)',
      },
      {
        id: 'AwsSolutions-COG3',
        reason: "This is a demo app, so we won't enable AdvancedSecurityMode",
      },
    ]);

    this.userPoolClient = new UserPoolClient(this, 'user-pool-client', {
      userPool: this.userPool,
      authFlows: {
        userSrp: true,
        custom: true,
      },
    });

    const { authenticatedRole, unauthenticatedRole, identityPoolId } =
      new IdentityPool(this, 'myIdentityPool', {
        allowUnauthenticatedIdentities: false,
        authenticationProviders: {
          userPools: [
            new UserPoolAuthenticationProvider({
              userPool: this.userPool,
              userPoolClient: this.userPoolClient,
            }),
          ],
        },
      });

    this.unauthRole = unauthenticatedRole;
    this.authRole = authenticatedRole;

    new CfnOutput(this, 'UserPoolId', {
      value: this.userPool.userPoolId,
    });

    new CfnOutput(this, 'UserPoolClientId', {
      value: this.userPoolClient.userPoolClientId,
    });

    new CfnOutput(this, 'IdentityPoolId', {
      value: identityPoolId,
    });
  }
}
