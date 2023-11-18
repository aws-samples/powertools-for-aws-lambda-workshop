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

S3_BUCKET_FILES = os.getenv("BUCKET_NAME_FILES", "")
FILES_TABLE_NAME = os.getenv("TABLE_NAME_FILES", "")
REGION_NAME = os.getenv("AWS_REGION", "")

dynamodb_client = boto3.client("dynamodb", region_name=REGION_NAME)
s3_client = boto3.client("s3", region_name=REGION_NAME)


@dataclass
class TransformImage:
    file_id: str
    user_id: str
    object_key: str
    object_etag: str

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

    print(f"Saved image on S3:{new_thumbnail_key}")

    return new_thumbnail_key


def lambda_handler(event, context):

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

    try:
        transform_image = TransformImage(
            file_id=file_id,
            user_id=user_id,
            object_key=object_key,
            object_etag=object_etag,
        )

        new_thumbnail_image = process_thumbnail(transform_image=transform_image)

        mark_file_as(file_id, FileStatus.DONE.value, new_thumbnail_image)
    except Exception as exc:
        mark_file_as(file_id, FileStatus.FAIL.value)
        print("An unexpected error occurred")
        raise Exception(exc)
