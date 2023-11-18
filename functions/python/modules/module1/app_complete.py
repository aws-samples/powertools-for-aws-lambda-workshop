import boto3
import os
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
    FileStatus,
    TransformSize
)
from aws_lambda_powertools import Logger, Metrics, Tracer
from aws_lambda_powertools.metrics import MetricUnit
from aws_lambda_powertools.utilities.typing import LambdaContext
from aws_lambda_powertools.utilities.idempotency import (
    idempotent_function,
    DynamoDBPersistenceLayer,
    IdempotencyConfig,
)

logger = Logger()
metrics = Metrics()
tracer = Tracer()

S3_BUCKET_FILES = os.getenv("BUCKET_NAME_FILES", "")
FILES_TABLE_NAME = os.getenv("TABLE_NAME_FILES", "")
IDEMPOTENCY_TABLE_NAME = os.getenv("IDEMPOTENCY_TABLE_NAME", "")
REGION_NAME = os.getenv("AWS_REGION", "")

persistence_layer = DynamoDBPersistenceLayer(table_name=IDEMPOTENCY_TABLE_NAME)
idempotency_config = IdempotencyConfig(
    event_key_jmespath="[user_id, object_etag]",
    raise_on_no_idempotency_key=True,
    expires_after_seconds=60 * 60 * 2,  # 2 hours
)

dynamodb_client = boto3.client("dynamodb", region_name=REGION_NAME)
s3_client = boto3.client("s3", region_name=REGION_NAME)


@dataclass
class TransformImage:
    file_id: str
    user_id: str
    object_key: str
    object_etag: str

@tracer.capture_method
@idempotent_function(
    persistence_store=persistence_layer,
    config=idempotency_config,
    data_keyword_argument="transform_image",
)
def process_thumbnail(transform_image: TransformImage):

    object_key = transform_image.object_key

    new_thumbnail_key: str = (
        f"{TRANSFORMED_IMAGE_PREFIX}/{uuid.uuid4()}{TRANSFORMED_IMAGE_EXTENSION}"
    )

    # Get the original image from S3
    original_image: bytes = get_original_object(
        s3_client=s3_client, object_key=object_key, bucket_name=S3_BUCKET_FILES
    )

    thumbnail_size = TransformSize.SMALL.value

    # Create thumbnail from original image
    thumbnail_image = create_thumbnail(
        original_image=original_image,
        width=thumbnail_size.get("width"),
        height=thumbnail_size.get("height"),
    )

    # Save the thumbnail on S3
    write_thumbnail_to_s3(
        s3_client=s3_client,
        object_key=new_thumbnail_key,
        bucket_name=S3_BUCKET_FILES,
        body=thumbnail_image,
    )

    # Add structured logging to the function
    logger.info("Saved image on S3", detail=new_thumbnail_key)

    # Annotate the subsegment with the new object key
    tracer.put_annotation("newObjectKey", new_thumbnail_key)

    metrics.add_metric(name="ThumbnailGenerated", unit=MetricUnit.Count, value=1)

    return new_thumbnail_key


@tracer.capture_lambda_handler
@metrics.log_metrics(capture_cold_start_metric=True)
@logger.inject_lambda_context(log_event=True)
def lambda_handler(event, context: LambdaContext):

    # Register Lambda context to handle potential timeouts
    idempotency_config.register_lambda_context(context)

    # Extract file info from the event and fetch additional metadata from DynamoDB
    object_key: str = event.get("detail", {}).get("object", {}).get("key")
    object_etag: str = event.get("detail", {}).get("object", {}).get("etag")
    image_metadata = get_image_metadata(
        dynamodb_client=dynamodb_client,
        table_name=FILES_TABLE_NAME,
        object_key=object_key,
    )
    file_id = image_metadata["fileId"]["S"]
    user_id = image_metadata["userId"]["S"]

    # Mark file as working, this will notify subscribers that the file is being processed
    mark_file_as(file_id, FileStatus.WORKING.value)

    # try to process file using idempotency
    try:
        transform_image = TransformImage(
            file_id=file_id,
            user_id=user_id,
            object_key=object_key,
            object_etag=object_etag,
        )

        new_thumbnail_image = process_thumbnail(transform_image=transform_image)

        metrics.add_metric(name="ImageProcessed", unit=MetricUnit.Count, value=1)

        mark_file_as(file_id, FileStatus.DONE.value, new_thumbnail_image)
    except Exception as exc:
        mark_file_as(file_id, FileStatus.FAIL.value)
        logger.exception("An unexpected error occurred", log=exc)
        raise Exception(exc)
