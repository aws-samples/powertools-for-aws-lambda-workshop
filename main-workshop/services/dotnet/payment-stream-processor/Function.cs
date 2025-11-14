public class Function
{
    private readonly StreamProcessorService _streamProcessorService;

    public Function()
    {
        _streamProcessorService = new StreamProcessorService();
    }

    [Tracing]
    [Metrics]
    [Logging]
    public async Task HandleStreamRecord(DynamoDBEvent streamEvent, ILambdaContext context)
    {
        var successCount = 0;
        var failureCount = 0;
        var totalCount = streamEvent.Records.Count;

        try
        {
            foreach (var record in streamEvent.Records)
            {
                var extractedData = await _streamProcessorService.ExtractRecord(record);

                // Add correlation ID to logger context for tracking
                if (!string.IsNullOrEmpty(extractedData.CorrelationId))
                {
                    Logger.AppendKey("correlation_id", extractedData.CorrelationId);
                }

                await _streamProcessorService.ProcessSingleRecordAsync(extractedData);

                Logger.LogInformation("RECORD PROCESSED: payment_id={paymentId}, ride_id={rideId}",
                    extractedData.PaymentId, extractedData.RideId);
                successCount++;
            }

            Logger.LogInformation(
                "BATCH COMPLETE: {successCount} success | {failureCount} failed of {total}", successCount,
                failureCount, totalCount);
        }
        catch (BatchExcpetion ex)
        {
            failureCount++;
            Logger.LogError(
                "BATCH FAILURES: {failureCount} failed | {successCount} success of {totalRecords}, {paymentId}",
                failureCount, successCount, totalCount, ex.PaymentModel.PaymentId);
            throw;
        }
        finally
        {
            Metrics.AddMetric("BatchSize", streamEvent.Records.Count, MetricUnit.Count);
            Metrics.AddMetric("SuccessfulRecords", successCount, MetricUnit.Count);
            Metrics.AddMetric("FailedRecords", failureCount, MetricUnit.Count);
        }
    }
}