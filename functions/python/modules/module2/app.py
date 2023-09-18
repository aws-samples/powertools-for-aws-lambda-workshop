from aws_lambda_powertools import Logger, Metrics, Tracer
from aws_lambda_powertools.metrics import MetricUnit
from aws_lambda_powertools.utilities.typing import LambdaContext
from aws_lambda_powertools.utilities.batch import (
    BatchProcessor,
    EventType,
    process_partial_response,
)
from aws_lambda_powertools.utilities.data_classes.dynamo_db_stream_event import (
    DynamoDBRecord,
)
from utils import get_labels, report_image_issue
from constants import S3_BUCKET_FILES
from exceptions import NoLabelsFoundError, NoPersonFoundError, ImageDetectionError


processor = BatchProcessor(event_type=EventType.DynamoDBStreams)

logger = Logger()
metrics = Metrics(namespace="workshop-opn301")
tracer = Tracer()


@tracer.capture_method
def record_handler(record: DynamoDBRecord):
    user_id = record.dynamodb.new_image.get("userId")
    transformed_key = record.dynamodb.new_image.get("transformedFileKey")
    file_id = record.dynamodb.new_image.get("id")

    with tracer.provider.in_subsegment("## get_labels") as subsegment:
        try:
            subsegment.put_annotation("file_id", file_id)
            get_labels(S3_BUCKET_FILES, file_id, user_id, transformed_key)
        except (NoLabelsFoundError, NoPersonFoundError):
            logger.warning(
                "No person found in the image", user_id=user_id, file_id=file_id
            )
            report_image_issue(file_id=file_id, user_id=user_id)
        except ImageDetectionError as error:
            subsegment.add_exception(error)
            logger.error(error)


@tracer.capture_lambda_handler
@metrics.log_metrics(capture_cold_start_metric=True)
@logger.inject_lambda_context(log_event=True)
def lambda_handler(event, context: LambdaContext):
    return process_partial_response(
        event=event, record_handler=record_handler, processor=processor, context=context
    )
