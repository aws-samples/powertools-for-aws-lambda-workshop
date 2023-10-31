import boto3
import os
from requests_aws_sign import AWSV4Sign
import requests

graphql_endpoint = os.getenv("APPSYNC_ENDPOINT", "")
REGION_NAME = os.getenv("AWS_REGION", "")

def mark_file_as(file_id, status, transformed_file_key=None):

    input = {
        "id": file_id,
        "status": status,
        "transformedFileKey": transformed_file_key,
    }

    query = """
        mutation UpdateFileStatus(
            $input: FileStatusUpdateInput!
        ) {
            updateFileStatus(input: $input){
                id
                status
                transformedFileKey
            }
        }
    """

    session = boto3.session.Session()
    credentials = session.get_credentials()

    auth = AWSV4Sign(credentials, REGION_NAME, "appsync")

    payload = {"query": query, "variables": {"input": input}}
    headers = {"Content-Type": "application/json"}

    try:
        response = requests.post(
            graphql_endpoint, auth=auth, json=payload, headers=headers
        ).json()
        if "errors" in response:
            print("Error attempting to query AppSync")
            print(response["errors"])
        else:
            return response
    except Exception as exception:
        print("Error with Mutation")
        print(exception)
