import { StackProps, CfnOutput, RemovalPolicy } from "aws-cdk-lib";
import { Construct } from "constructs";
import { IRole } from "aws-cdk-lib/aws-iam";
import {
  AccountRecovery,
  UserPool,
  IUserPool,
  UserPoolClient,
  VerificationEmailStyle,
  IUserPoolClient,
} from "aws-cdk-lib/aws-cognito";
import {
  IdentityPool,
  UserPoolAuthenticationProvider,
} from "@aws-cdk/aws-cognito-identitypool-alpha";
import { Function } from "aws-cdk-lib/aws-lambda";
import { environment } from "../constants";

interface AuthConstructProps extends StackProps {
  preSignUpCognitoTriggerFn: Function;
}

export class AuthConstruct extends Construct {
  authRole: IRole;
  unauthRole: IRole;
  userPool: IUserPool;
  userPoolClient: IUserPoolClient;

  constructor(scope: Construct, id: string, props: AuthConstructProps) {
    super(scope, id);

    const { preSignUpCognitoTriggerFn } = props;

    this.userPool = new UserPool(this, "user-pool", {
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
      removalPolicy: RemovalPolicy.DESTROY,
      lambdaTriggers: {
        preSignUp: preSignUpCognitoTriggerFn,
      },
    });

    this.userPoolClient = new UserPoolClient(this, "user-pool-client", {
      userPool: this.userPool,
    });

    const { authenticatedRole, unauthenticatedRole, identityPoolId } =
      new IdentityPool(this, "myIdentityPool", {
        allowUnauthenticatedIdentities: true,
        authenticationProviders: {
          userPools: [
            new UserPoolAuthenticationProvider({ userPool: this.userPool }),
          ],
        },
      });

    this.unauthRole = unauthenticatedRole;
    this.authRole = authenticatedRole;

    new CfnOutput(this, "UserPoolId", {
      value: this.userPool.userPoolId,
    });

    new CfnOutput(this, "UserPoolClientId", {
      value: this.userPoolClient.userPoolClientId,
    });

    new CfnOutput(this, "IdentityPoolId", {
      value: identityPoolId,
    });
  }
}
