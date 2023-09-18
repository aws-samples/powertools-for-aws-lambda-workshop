from __future__ import annotations

from PIL import Image
import io

# Should we add stubs to make easy typing?


def extract_file_id(object_key: str) -> str:
    return object_key.split("/")[-1].split(".")[0]


def get_image_metadata(dynamodb_client, table_name: str, object_key: str):
    try:
        response = dynamodb_client.get_item(
            TableName=table_name,
            Key={"id": {"S": extract_file_id(object_key)}},
            ProjectionExpression="id, userId",
        )

        if "Item" not in response:
            raise Exception("File metadata not found")

        return {"fileId": response["Item"]["id"], "userId": response["Item"]["userId"]}
    except Exception as e:
        raise e


def get_original_object(s3_client, object_key: str, bucket_name: str):

    try:
        response = s3_client.get_object(Bucket=bucket_name, Key=object_key)
        body = response["Body"]

        chunks = []
        while True:
            data = body.read(1024)  # 1kb I think it's ok
            if not data:
                break
            chunks.append(data)
        return b"".join(chunks)
    except Exception as e:
        raise Exception(
            f"Error getting file from S3 -> {str(e)}"
        )  # Handle or log the exception as needed


def create_thumbnail(original_image: bytes, width: int, height: int) -> bytes | None:
    try:
        # Create a PIL Image object from the image bytes
        image = Image.open(io.BytesIO(original_image))

        # Resize the image to the specified width and height
        image.thumbnail((width, height))

        # Convert the image to JPEG format and return the bytes
        buffer = io.BytesIO()
        image.save(buffer, format="JPEG")
        return buffer.getvalue()
    except Exception as e:
        # Handle any exceptions that may occur during image processing
        print(f"Error creating thumbnail: {str(e)}")
        return None


def write_thumbnail_to_s3(
    s3_client, object_key: str, bucket_name: str, body: bytes = None
):
    try:
        file_body = body
        # Upload the object to the specified S3 bucket
        s3_client.put_object(Bucket=bucket_name, Key=object_key, Body=file_body)
    except Exception as e:
        # Handle any exceptions that may occur during the S3 upload
        print(f"Error writing to S3: {str(e)}")
