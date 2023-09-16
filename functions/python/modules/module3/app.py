from requests import Response

from aws_lambda_powertools import Logger, Metrics, Tracer

from aws_lambda_powertools.event_handler import APIGatewayRestResolver
from aws_lambda_powertools.event_handler.api_gateway import Response, content_types
from aws_lambda_powertools.utilities.typing import LambdaContext

app = APIGatewayRestResolver()

logger = Logger()
metrics = Metrics(namespace="workshop-opn301")
tracer = Tracer()

@app.get("/")
def get_index():
    return Response(status_code=200, content_type=content_types.APPLICATION_JSON, body="Hello from module 3")

@tracer.capture_lambda_handler
@metrics.log_metrics(capture_cold_start_metric=True)
@logger.inject_lambda_context(log_event=True)
def lambda_handler(event: dict, context: LambdaContext) -> dict:
    return app.resolve(event, context)
