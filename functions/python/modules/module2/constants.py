from enum import Enum
import os

S3_BUCKET_FILES = os.getenv("BUCKET_NAME_FILES", "")
APIURL = os.getenv("API_URL_PARAMETER_NAME", "")
APIKEY = os.getenv("API_KEY_SECRET_NAME", "")
