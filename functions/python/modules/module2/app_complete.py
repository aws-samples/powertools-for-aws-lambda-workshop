import os
from aws_lambda_powertools import Logger, Tracer
from aws_lambda_powertools.utilities.typing import LambdaContext
from aws_lambda_powertools.utilities.batch import (
    BatchProcessor,
    EventType,
    process_partial_response,
)
from aws_lambda_powertools.utilities.batch.types import PartialItemFailureResponse
from aws_lambda_powertools.utilities.data_classes.dynamo_db_stream_event import (
    DynamoDBRecord,
)
from functions.python.modules.module2.app import API_KEY_SECRET_NAME, API_URL_HOST
from utils import get_labels, report_image_issue
from exceptions import NoLabelsFoundError, NoPersonFoundError, ImageDetectionError
from aws_lambda_powertools.utilities import parameters


processor = BatchProcessor(event_type=EventType.DynamoDBStreams)  

logger = Logger()
tracer = Tracer()

S3_BUCKET_FILES = os.getenv("BUCKET_NAME_FILES", "")
API_URL_PARAMETER_NAME = os.getenv("API_URL_PARAMETER_NAME", "")
API_KEY_SECRET_NAME = os.getenv("API_KEY_SECRET_NAME", "")


@tracer.capture_method
def record_handler(record: DynamoDBRecord, lambda_context: LambdaContext):

    if lambda_context.get_remaining_time_in_millis() < 1000:
        logger.warning("Invocation is about to time out, marking all remaining records as failed")
        raise Exception("Time remaining <1s, marking record as failed to retry later")

    # Since we are applying the filter at the DynamoDB Stream level,
    # we know that the record has a NewImage otherwise the record would not be here
    user_id = record.dynamodb.new_image.get("userId")
    transformed_key = record.dynamodb.new_image.get("transformedFileKey")
    file_id = record.dynamodb.new_image.get("id")

    # Add the file id and user id to the logger so that all the logs after this
    # will have these attributes and we can correlate them
    logger.append_keys(file_id=file_id, user_id=user_id)

    # Add the file id and user id as annotations to the segment so that we can correlate the logs with the traces
    tracer.put_annotation("file_id", file_id)
    tracer.put_annotation("user_id", user_id)

    with tracer.provider.in_subsegment("## get_labels") as subsegment:
        try:
            get_labels(S3_BUCKET_FILES, file_id, user_id, transformed_key)
        except (NoLabelsFoundError, NoPersonFoundError):
            logger.warning("No person found in the image")
            # Get the apiUrl and apiKey
            # You can replace these with the actual values or retrieve them from a secret manager.
            api_url = parameters.get_parameter(API_URL_PARAMETER_NAME, transform="json", max_age=900)["url"]
            api_key = parameters.get_secret(API_KEY_SECRET_NAME)
            report_image_issue(file_id=file_id, user_id=user_id, api_key=api_key, api_url=api_url)
        except ImageDetectionError as error:
            subsegment.add_exception(error)
            logger.error(error)
        finally:
            logger.remove_keys(["file_id", "user_id"])

@tracer.capture_lambda_handler
@logger.inject_lambda_context(log_event=True)
def lambda_handler(event, context: LambdaContext) -> PartialItemFailureResponse:
    return process_partial_response(event=event, record_handler=record_handler, processor=processor, context=context)
