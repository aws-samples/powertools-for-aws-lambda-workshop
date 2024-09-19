import { Construct } from 'constructs';
import { AuthConstruct } from './auth-construct.js';
import { DistributionConstruct } from './distribution-construct.js';
import { StorageConstruct } from './storage-construct.js';
import { CustomResource } from 'aws-cdk-lib';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Provider } from 'aws-cdk-lib/custom-resources';
import { FunctionsConstruct } from './functions-construct.js';

class FrontendProps {}

export class Frontend extends Construct {
  public readonly auth: AuthConstruct;
  public readonly cdn: DistributionConstruct;
  public readonly storage: StorageConstruct;

  public constructor(scope: Construct, id: string, _props: FrontendProps) {
    super(scope, id);

    this.auth = new AuthConstruct(this, 'auth-construct', {});

    this.storage = new StorageConstruct(this, 'storage-construct', {});

    const functions = new FunctionsConstruct(this, 'functions-construct', {});
    functions.usersGeneratorFn.addEnvironment(
      'COGNITO_USER_POOL_CLIENT_ID',
      this.auth.userPoolClient.userPoolClientId
    );

    this.cdn = new DistributionConstruct(this, 'distribution-construct', {
      websiteBucket: this.storage.websiteBucket,
    });

    const provider = new Provider(this, 'DummyUsersProvider', {
      onEventHandler: functions.usersGeneratorFn,
      logRetention: RetentionDays.ONE_DAY,
    });

    new CustomResource(this, 'Custom:DummyUsers', {
      serviceToken: provider.serviceToken,
    });
  }

  public addApiBehavior(apiDomain: string): void {
    this.cdn.addApiBehavior(apiDomain);
  }
}
