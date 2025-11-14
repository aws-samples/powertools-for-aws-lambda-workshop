import json
import os
from decimal import Decimal

import boto3

from models import SecretData


class RushHourMultiplierService:
    """Service for retrieving rush hour multiplier from AWS Secrets Manager"""

    def __init__(self):
        self.secrets_manager = boto3.client("secretsmanager")
        self.secret_name = os.environ.get("RUSH_HOUR_MULTIPLIER_SECRET_NAME", "")

        if not self.secret_name:
            raise ValueError(
                "RUSH_HOUR_MULTIPLIER_SECRET_NAME environment variable is not set"
            )

    def get_rush_hour_multiplier(self) -> Decimal:
        """Retrieve rush hour multiplier from AWS Secrets Manager"""
        response = self.secrets_manager.get_secret_value(SecretId=self.secret_name)

        if not response.get("SecretString"):
            raise Exception("Failed to deserialize secret data")

        secret_data_dict = json.loads(response["SecretString"])
        secret_data = SecretData(**secret_data_dict)

        return secret_data.rush_hour_multiplier
