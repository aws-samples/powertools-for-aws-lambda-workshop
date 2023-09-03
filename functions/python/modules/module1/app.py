import boto3
import uuid
from utils import (
    get_image_metadata,
    s3_bucket_files,
    files_table_name,
    idempotency_table_name,
    region_name
)
from constants import TRANSFORMED_IMAGE_PREFIX, TRANSFORMED_IMAGE_EXTENSION
from aws_lambda_powertools import Logger, Metrics, Tracer
from aws_lambda_powertools.utilities.typing import LambdaContext
from aws_lambda_powertools.utilities.idempotency import idempotent_function, DynamoDBPersistenceLayer, IdempotencyConfig
# Data class - Use this?
#from aws_lambda_powertools.utilities.data_classes import event_source, EventBridgeEvent

# DynamoDB client
dynamodb_client = boto3.client("dynamodb", region_name=region_name)

logger = Logger()
metrics = Metrics(namespace="workshop-opn301")
tracer = Tracer()

# Change table name? Get from ENV?
persistence_layer = DynamoDBPersistenceLayer(table_name=idempotency_table_name)
idempotency_config = IdempotencyConfig(
    event_key_jmespath='[etag,userId]',
    raise_on_no_idempotency_key=True,
    expires_after_seconds=60 * 60 * 2, # 2 hours
)


#@idempotent_function
def process_one(object_key: str):
    new_object_key: str = f"{TRANSFORMED_IMAGE_PREFIX}/{uuid.uuid4()}/{TRANSFORMED_IMAGE_PREFIX}"


# Data class - Use this?
#@event_source(data_class=EventBridgeEvent)
@tracer.capture_lambda_handler
@metrics.log_metrics(capture_cold_start_metric=True)
@logger.inject_lambda_context(log_event=True)
def lambda_handler(event, context: LambdaContext):
    # Register Lambda context to handle potential timeouts
    idempotency_config.register_lambda_context(context)

    # Extract file info from the event and fetch additional metadata from DynamoDB
    # Use data class?
    object_key: str = event.get("detail", {}).get("object", {}).get("key")
    object_etag: str = event.get("detail", {}).get("object", {}).get("etag")

    image_metadata = get_image_metadata(dynamodb_client=dynamodb_client, table_name=files_table_name, object_key=object_key)
    file_id = image_metadata["fileId"]["S"]
    user_id = image_metadata["userId"]["S"]

    # Add GraphQL API
    # Mark file as working, this will notify subscribers that the file is being processed
    print(image_metadata)
    print(event)
