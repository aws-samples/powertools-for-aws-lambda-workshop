import { RemovalPolicy, type StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Secret } from 'aws-cdk-lib/aws-secretsmanager';
import { idePasswordSecretName } from './constants';
import { NagSuppressions } from 'cdk-nag';

interface SecretConstructProps extends StackProps {}

export class SecretConstruct extends Construct {
  public readonly secret: Secret;

  public constructor(
    scope: Construct,
    id: string,
    _props: SecretConstructProps
  ) {
    super(scope, id);

    this.secret = new Secret(this, 'ide-password', {
      secretName: idePasswordSecretName,
      generateSecretString: {
        excludePunctuation: true,
        excludeCharacters: '"@/\\',
        passwordLength: 30,
      },
      removalPolicy: RemovalPolicy.DESTROY,
    });

    NagSuppressions.addResourceSuppressions(this.secret, [
      {
        id: 'AwsSolutions-SMG4',
        reason:
          'The secret is used exclusively to store the access key to the browser-based IDE that is used for short-lived workshops.',
      },
    ]);
  }
}
