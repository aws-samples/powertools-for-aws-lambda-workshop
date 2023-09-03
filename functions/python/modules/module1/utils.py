import os
# Should we add stubs to make easy typing?

s3_bucket_files = os.getenv("BUCKET_NAME_FILES", "aaaabbcccdddd")
files_table_name = os.getenv("TABLE_NAME_FILES", "store_images")
idempotency_table_name = os.getenv("IDEMPOTENCY_TABLE_NAME", "ddbtimeout")
region_name = os.getenv("AWS_REGION", "us-east-1")


def extract_file_id(object_key: str) -> str:
    return object_key.split('/')[-1].split('.')[0]

def get_image_metadata(dynamodb_client, table_name: str, object_key: str):
    try:
        response = dynamodb_client.get_item(
            TableName=table_name,
            Key={
                'id': {"S": extract_file_id(object_key)}
            },
            ProjectionExpression='id, userId'
        )

        if 'Item' not in response:
            raise Exception('File metadata not found')

        return {
            'fileId': response['Item']['id'],
            'userId': response['Item']['userId']
        }
    except Exception as e:
        raise e
