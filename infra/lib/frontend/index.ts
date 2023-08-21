import { Construct } from 'constructs';
import { AuthConstruct } from './auth-construct';
import { DistributionConstruct } from './distribution-construct';
import { StorageConstruct } from './storage-construct';

class FrontendProps {}

export class Frontend extends Construct {
  public readonly auth: AuthConstruct;
  public readonly cdn: DistributionConstruct;
  public readonly storage: StorageConstruct;

  public constructor(scope: Construct, id: string, _props: FrontendProps) {
    super(scope, id);

    this.storage = new StorageConstruct(this, 'storage-construct', {});

    this.auth = new AuthConstruct(this, 'auth-construct', {});

    this.cdn = new DistributionConstruct(this, 'distribution-construct', {
      websiteBucket: this.storage.websiteBucket,
    });
  }

  public addApiBehavior(apiDomain: string): void {
    this.cdn.addApiBehavior(apiDomain);
  }
}
