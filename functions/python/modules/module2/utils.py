import boto3
from exceptions import NoLabelsFoundError, NoPersonFoundError, ImageDetectionError
import requests
import json
from botocore import errorfactory

rekognition_client = boto3.client("rekognition")


def get_labels(bucket_name, file_id, user_id, transformed_file_key):
    try:
        response = rekognition_client.detect_labels(
            Image={
                "S3Object": {
                    "Bucket": bucket_name,
                    "Name": transformed_file_key,
                },
            }
        )

        labels = response["Labels"]

        if not labels or len(labels) == 0:
            raise NoLabelsFoundError

        person_label = next(
            (
                label
                for label in labels
                if label.get("Name", "") == "Person" and label.get("Confidence", 0) > 75
            ),
            None,
        )

        if not person_label:
            raise NoPersonFoundError

    except errorfactory.ClientError:
        raise ImageDetectionError("Object not found in S3")


def report_image_issue(file_id: str, user_id: str, api_url: str, api_key: str, logger):
    if not api_url or not api_key:
        raise Exception(f"Missing apiUrl or apiKey. apiUrl: {api_url}, apiKey: {api_key}")

    # Send the report to the API
    headers = {
        'Content-Type': 'application/json',
        'x-api-key': api_key,
    }
    data = {
        'fileId': file_id,
        'userId': user_id,
    }

    logger.debug('Sending report to the API')

    requests.post(api_url, headers=headers, data=json.dumps(data))

    logger.debug('report sent to the API')
