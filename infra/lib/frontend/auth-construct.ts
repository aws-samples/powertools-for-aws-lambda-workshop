import { StackProps, CfnOutput, RemovalPolicy } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { IRole } from 'aws-cdk-lib/aws-iam';
import {
  AccountRecovery,
  UserPool,
  IUserPool,
  UserPoolClient,
  VerificationEmailStyle,
  IUserPoolClient,
} from 'aws-cdk-lib/aws-cognito';
import {
  IdentityPool,
  UserPoolAuthenticationProvider,
} from '@aws-cdk/aws-cognito-identitypool-alpha';
import { Function as FunctionType } from 'aws-cdk-lib/aws-lambda';
import { NagSuppressions } from 'cdk-nag';
import { environment } from '../constants';

interface AuthConstructProps extends StackProps {
  preSignUpCognitoTriggerFn: FunctionType
}

export class AuthConstruct extends Construct {
  public readonly authRole: IRole;
  public readonly unauthRole: IRole;
  public readonly userPool: IUserPool;
  public readonly userPoolClient: IUserPoolClient;

  public constructor(scope: Construct, id: string, props: AuthConstructProps) {
    super(scope, id);

    const { preSignUpCognitoTriggerFn } = props;

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
        reason: 'The default for this construct already sets a strict password policy',
      },
      {
        id: 'AwsSolutions-COG2',
        reason: 'This is a demo app, so we want to allow users to sign up easily (no MFA)',
      },
      {
        id: 'AwsSolutions-COG3',
        reason: 'This is a demo app, so we won\'t enable AdvancedSecurityMode',
      }
    ]);

    this.userPoolClient = new UserPoolClient(this, 'user-pool-client', {
      userPool: this.userPool,
      authFlows: {
        adminUserPassword: true,
        userSrp: true,
      },
    });

    const { authenticatedRole, unauthenticatedRole, identityPoolId } =
      new IdentityPool(this, 'myIdentityPool', {
        allowUnauthenticatedIdentities: false,
        authenticationProviders: {
          userPools: [
            new UserPoolAuthenticationProvider({ userPool: this.userPool }),
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
