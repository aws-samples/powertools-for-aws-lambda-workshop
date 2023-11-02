from enum import Enum

TRANSFORMED_IMAGE_PREFIX = "transformed/image/jpg"
TRANSFORMED_IMAGE_EXTENSION = ".jpeg"

TRANSFORM_SIZE = {
    "SMALL": {"width": 720, "height": 480},
    "MEDIUM": {"width": 1280, "height": 720},
    "LARGE": {"width": 1920, "height": 1080},
}

class TransformSize(Enum):
    SMALL = {"width": 720, "height": 480}
    MEDIUM = {"width": 1280, "height": 720}
    LARGE = {"width": 1920, "height": 1080}


class FileStatus(Enum):
    QUEUED = "queued"
    WORKING = "in-progress"
    DONE = "completed"
    FAIL = "failed"
