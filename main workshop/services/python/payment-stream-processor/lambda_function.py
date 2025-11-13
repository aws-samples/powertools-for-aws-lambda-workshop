from typing import Any

from aws_lambda_powertools import Logger, Metrics, Tracer
from aws_lambda_powertools.metrics import MetricUnit, MetricResolution

from operations import PaymentStreamOperations

logger = Logger()
tracer = Tracer()
metrics = Metrics()

stream_ops = PaymentStreamOperations()


@tracer.capture_lambda_handler
@logger.inject_lambda_context
@metrics.log_metrics
def lambda_handler(event: dict[str, Any], context: Any) -> None:
    """
    Lambda handler for DynamoDB Streams from Payments table.
    Processes payment completion events and publishes PaymentCompleted events
    to EventBridge.
    """
    records = event.get("Records", [])
    success_count = 0
    failure_count = 0
    total_count = len(records)

    try:
        for record in records:
            try:
                metrics.add_metric(name="ExtractedRecords", unit=MetricUnit.Count, value=1)
                
                extracted_data = stream_ops.extract_record(record)
                
                # Add correlation ID to logger context for tracking
                if extracted_data.correlation_id:
                    logger.append_keys(correlation_id=extracted_data.correlation_id)
                
                stream_ops.process_single_record(extracted_data)

                logger.info(
                    "RECORD PROCESSED",
                    payment_id=extracted_data.payment_id,
                    ride_id=extracted_data.ride_id,
                )
                
                success_count += 1

            except Exception as e:
                failure_count += 1
                logger.error(
                    "RECORD FAILED - entire batch will be retried",
                    error=str(e),
                    success_count=success_count,
                    failure_count=failure_count,
                    exc_info=True,
                )
                # Re-raise to fail the entire batch
                raise

        logger.info(
            "BATCH COMPLETE",
            success_count=success_count,
            failure_count=failure_count,
            total_records=total_count,
        )

    finally:
        metrics.add_metric(
            name="BatchSize", unit=MetricUnit.Count, value=total_count, resolution=MetricResolution.High
        )
        metrics.add_metric(
            name="SuccessfulRecords", unit=MetricUnit.Count, value=success_count, resolution=MetricResolution.High
        )
        metrics.add_metric(
            name="FailedRecords", unit=MetricUnit.Count, value=failure_count, resolution=MetricResolution.High
        )