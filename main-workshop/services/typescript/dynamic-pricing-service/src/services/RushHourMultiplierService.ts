import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from '@aws-sdk/client-secrets-manager';
import { captureAWSv3Client } from 'aws-xray-sdk-core';
import type { SecretData } from '../models';

export class RushHourMultiplierService {
  private readonly secretsManager: SecretsManagerClient;
  private readonly secretName: string;

  constructor() {
    this.secretsManager = captureAWSv3Client(new SecretsManagerClient({}));
    this.secretName = process.env.RUSH_HOUR_MULTIPLIER_SECRET_NAME || '';

    if (!this.secretName) {
      throw new Error(
        'RUSH_HOUR_MULTIPLIER_SECRET_NAME environment variable is not set'
      );
    }
  }

  async getRushHourMultiplier(): Promise<number> {
    const command = new GetSecretValueCommand({
      SecretId: this.secretName,
    });

    const response = await this.secretsManager.send(command);

    if (!response.SecretString) {
      throw new Error('Failed to deserialize secret data');
    }

    const secretData: SecretData = JSON.parse(response.SecretString);

    return secretData.rushHourMultiplier;
  }
}
