from requests import Response

from aws_lambda_powertools.event_handler import APIGatewayRestResolver
from aws_lambda_powertools.event_handler.api_gateway import Response, content_types
from aws_lambda_powertools.utilities.typing import LambdaContext

app = APIGatewayRestResolver()

@app.get("/")
def get_index():
    return Response(status_code=200, content_type=content_types.APPLICATION_JSON, body="Returning from index")


def lambda_handler(event: dict, context: LambdaContext) -> dict:
    return app.resolve(event, context)
