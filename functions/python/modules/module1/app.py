import boto3
import uuid
from dataclasses import dataclass
from utils import (
    get_image_metadata,
    get_original_object,
    create_thumbnail,
    write_thumbnail_to_s3,
)
from graphql import mark_file_as
from constants import (
    TRANSFORMED_IMAGE_PREFIX,
    TRANSFORMED_IMAGE_EXTENSION,
    TRANSFORM_SIZE,
    FILES_TABLE_NAME,
    IDEMPOTENCY_TABLE_NAME,
    REGION_NAME,
    S3_BUCKET_FILES,
    FileStatus,
)
from aws_lambda_powertools import Logger, Metrics, Tracer
from aws_lambda_powertools.metrics import MetricUnit
from aws_lambda_powertools.utilities.typing import LambdaContext
from aws_lambda_powertools.utilities.idempotency import (
    idempotent_function,
    DynamoDBPersistenceLayer,
    IdempotencyConfig,
)

# Data class - Use this?
# from aws_lambda_powertools.utilities.data_classes import event_source, EventBridgeEvent

# DynamoDB client
dynamodb_client = boto3.client("dynamodb", region_name=REGION_NAME)
s3_client = boto3.client("s3", region_name=REGION_NAME)

logger = Logger()
metrics = Metrics(namespace="workshop-opn301")
tracer = Tracer()


@dataclass
class TransformImage:
    file_id: str
    user_id: str
    object_key: str
    object_etag: str


# Change table name? Get from ENV?
persistence_layer = DynamoDBPersistenceLayer(table_name=IDEMPOTENCY_TABLE_NAME)
idempotency_config = IdempotencyConfig(
    event_key_jmespath="[user_id, object_etag]",
    raise_on_no_idempotency_key=True,
    expires_after_seconds=60 * 60 * 2,  # 2 hours
)


@idempotent_function(
    persistence_store=persistence_layer,
    config=idempotency_config,
    data_keyword_argument="transform_image",
)
def process_thumbnail(transform_image: TransformImage):

    object_key = transform_image.object_key
    object_etag = transform_image.object_etag

    new_thumbnail_key: str = (
        f"{TRANSFORMED_IMAGE_PREFIX}/{uuid.uuid4()}{TRANSFORMED_IMAGE_EXTENSION}"
    )

    logger.info(
        f"Generate Thumbnail for Object Key: {object_key} and Etag: {object_etag}"
    )

    original_image: bytes = get_original_object(
        s3_client=s3_client, object_key=object_key, bucket_name=S3_BUCKET_FILES
    )

    thumbnail_size = TRANSFORM_SIZE.get("SMALL")

    thumbnail_image = create_thumbnail(
        original_image=original_image,
        width=thumbnail_size.get("width"),
        height=thumbnail_size.get("height"),
    )

    write_thumbnail_to_s3(
        s3_client=s3_client,
        object_key=new_thumbnail_key,
        bucket_name=S3_BUCKET_FILES,
        body=thumbnail_image,
    )

    logger.info("Saved image on S3", detail=new_thumbnail_key)

    metrics.add_metric(name="processedImages", unit=MetricUnit.Count, value=1)

    return new_thumbnail_key


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

    image_metadata = get_image_metadata(
        dynamodb_client=dynamodb_client,
        table_name=FILES_TABLE_NAME,
        object_key=object_key,
    )
    file_id = image_metadata["fileId"]["S"]
    user_id = image_metadata["userId"]["S"]

    mark_file_as(file_id, FileStatus.WORKING.value)

    # try to process file using idempotency
    try:
        transform_image = TransformImage(
            file_id=file_id,
            user_id=user_id,
            object_key=object_key,
            object_etag=object_etag,
        )

        process_thumbnail(transform_image=transform_image)

        mark_file_as(file_id, FileStatus.DONE.value)

        # ADD GRAPHQL API
    except Exception as exc:
        mark_file_as(file_id, FileStatus.FAIL.value)
        logger.exception("An unexpected error occurred", log=exc)
        raise Exception(exc)
