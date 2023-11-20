import os
import boto3
import json
from aws_lambda_powertools import Logger, Tracer
from aws_lambda_powertools.utilities.typing import LambdaContext
from aws_lambda_powertools.utilities.data_classes.dynamo_db_stream_event import (
    DynamoDBRecord,
)
from utils import get_labels, report_image_issue
from exceptions import NoLabelsFoundError, NoPersonFoundError, ImageDetectionError


logger = Logger()
tracer = Tracer()

S3_BUCKET_FILES = os.getenv("BUCKET_NAME_FILES", "")
API_URL_HOST = os.getenv("API_URL_HOST", "")
API_KEY_SECRET_NAME = os.getenv("API_KEY_SECRET_NAME", "")

secrets = boto3.client("secretsmanager")

def get_secret_value(secret_id: str):
    return secrets.get_secret_value(SecretId=secret_id).get("SecretString")


def record_handler(record: DynamoDBRecord):

    # Since we are applying the filter at the DynamoDB Stream level,
    # we know that the record has a NewImage otherwise the record would not be here
    user_id = record.dynamodb.new_image.get("userId")
    transformed_key = record.dynamodb.new_image.get("transformedFileKey")
    file_id = record.dynamodb.new_image.get("id")

    try:
        get_labels(S3_BUCKET_FILES, file_id, user_id, transformed_key)
    except (NoLabelsFoundError, NoPersonFoundError):
        logger.warning("No person found in the image")
        api_url = json.loads(API_URL_HOST).get("url")
        api_key = get_secret_value(API_KEY_SECRET_NAME)
        if not api_key:
            raise Exception(f"Unable to get secret {api_key}")
        
        report_image_issue(file_id=file_id, user_id=user_id, api_key=api_key, api_url=api_url)
    except ImageDetectionError as error:
        logger.error(error)
        raise Exception("Error detecting image")

@tracer.capture_lambda_handler
@logger.inject_lambda_context(log_event=True)
def lambda_handler(event, context: LambdaContext):
    for record in event["Records"]:
        record_handler(DynamoDBRecord(record))
