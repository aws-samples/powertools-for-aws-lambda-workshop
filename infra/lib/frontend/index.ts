import { Construct } from 'constructs';
import { AuthConstruct } from './auth-construct';
import { FunctionsConstruct } from './functions-construct';
import { DistributionConstruct } from './distribution-construct';
import { StorageConstruct } from './storage-construct';

class FrontendProps {}

export class Frontend extends Construct {
  public readonly storage: StorageConstruct;
  public readonly auth: AuthConstruct;
  public readonly cdn: DistributionConstruct;
  private readonly functions: FunctionsConstruct;

  constructor(scope: Construct, id: string, _props: FrontendProps) {
    super(scope, id);

    this.storage = new StorageConstruct(this, 'storage-construct', {});

    this.functions = new FunctionsConstruct(this, 'functions-construct', {});

    this.auth = new AuthConstruct(this, 'auth-construct', {
      preSignUpCognitoTriggerFn: this.functions.preSignUpCognitoTriggerFn,
    });

    this.cdn = new DistributionConstruct(this, 'distribution-construct', {
      websiteBucket: this.storage.websiteBucket,
    });
  }

  public addApiBehavior(apiDomain: string) {
    this.cdn.addApiBehavior(apiDomain);
  }
}
