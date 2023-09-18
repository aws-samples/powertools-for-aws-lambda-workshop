from enum import Enum
import os

S3_BUCKET_FILES = os.getenv("BUCKET_NAME_FILES", "")
FILES_TABLE_NAME = os.getenv("TABLE_NAME_FILES", "")
IDEMPOTENCY_TABLE_NAME = os.getenv("IDEMPOTENCY_TABLE_NAME", "")
REGION_NAME = os.getenv("AWS_REGION", "")

TRANSFORMED_IMAGE_PREFIX = "transformed/image/jpg"
TRANSFORMED_IMAGE_EXTENSION = ".jpeg"

TRANSFORM_SIZE = {
    "SMALL": {"width": 720, "height": 480},
    "MEDIUM": {"width": 1280, "height": 720},
    "LARGE": {"width": 1920, "height": 1080},
}


class FileStatus(Enum):
    QUEUED = "queued"
    WORKING = "in-progress"
    DONE = "completed"
    FAIL = "failed"
