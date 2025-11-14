using Amazon.EventBridge;
using Amazon.EventBridge.Model;
using System.Text.Json;

[assembly: LambdaSerializer(typeof(Amazon.Lambda.Serialization.SystemTextJson.DefaultLambdaJsonSerializer))]

public class StreamProcessorService
{
    private readonly IAmazonEventBridge _eventBridge;
    private readonly string _eventBusName;
    private readonly JsonSerializerOptions _serializerOptions;

    public StreamProcessorService()
    {
        _eventBridge = new AmazonEventBridgeClient();
        _eventBusName = Environment.GetEnvironmentVariable("EVENT_BUS_NAME") ?? "";
        
        _serializerOptions = new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        };
    }
    
    /// <summary>
    /// Extract record metadata without processing (safe operation that shouldn't fail)
    /// </summary>
    public async Task<PaymentModel> ExtractRecord(DynamoDBEvent.DynamodbStreamRecord record)
    {
        // Simulate expensive API call with 500ms latency
        await Task.Delay(500);
        
        // Extract payment data from the stream record
        Dictionary<string, DynamoDBEvent.AttributeValue>? newImage = record.Dynamodb.NewImage;
        
        // Extract business context for logging
        var paymentId = GetAttributeValue(newImage, "paymentId");
        var rideId = GetAttributeValue(newImage, "rideId");
        var riderId = GetAttributeValue(newImage, "riderId");
        var driverId = GetAttributeValue(newImage, "driverId");
        var correlationId = GetAttributeValue(newImage, "correlationId");
        var amount = GetAttributeValue(newImage, "amount");
        var paymentMethod = GetAttributeValue(newImage, "paymentMethod");
        var transactionId = GetAttributeValue(newImage, "transactionId");
        var status = GetAttributeValue(newImage, "status");

        return new PaymentModel
        {
            Success = true,
            PaymentId = paymentId,
            RideId = rideId,
            RiderId = riderId,
            DriverId = driverId,
            CorrelationId = correlationId,
            Amount = amount,
            PaymentMethod = paymentMethod,
            TransactionId = transactionId,
            Status = status
        };
    }
    
    public async Task<PaymentModel> ProcessSingleRecordAsync(PaymentModel extractedData)
    {
        // FAILURE SCENARIO: Simulate poison records (records that always fail)
        // Check for a special "poison" payment ID that always causes failures
        if (extractedData.PaymentId?.Contains("POISON") == true)
        {
            throw new BatchExcpetion($"Poison record detected: {extractedData.PaymentId}", extractedData);
        }
        
        await ProcessPaymentCompletionAsync(extractedData);
        return extractedData;
    }

    private async Task ProcessPaymentCompletionAsync(PaymentModel extractedData)
    {
        // Skip test/synthetic data first (before any processing)
        if (string.IsNullOrEmpty(_eventBusName) || extractedData.RiderId == "rider-batch-test")
        {
            return;
        }
        
        // Only process payments with 'completed' status
        if (extractedData.Status != "completed")
        {
            // Skip failed or processing payments - don't send completion events
            return;
        }

        // Parse amount to decimal for proper JSON serialization
        if (!decimal.TryParse(extractedData.Amount, out var amountDecimal))
        {
            throw new FormatException($"Invalid amount format: {extractedData.Amount}");
        }

        var completionEvent = new
        {
            EventType = "PaymentCompleted",
            PaymentId = extractedData.PaymentId,
            RideId = extractedData.RideId,
            RiderId = extractedData.RiderId,
            DriverId = extractedData.DriverId,
            Amount = amountDecimal,
            PaymentMethod = extractedData.PaymentMethod,
            TransactionId = extractedData.TransactionId,
            Timestamp = DateTime.UtcNow.ToString("O"),
            CorrelationId = extractedData.CorrelationId
        };

        await SendEventToEventBridgeAsync("PaymentCompleted", completionEvent);
    }

    /// <summary>
    /// Send event to EventBridge
    /// </summary>
    private async Task SendEventToEventBridgeAsync(string detailType, object eventDetail)
    {
        var eventDetailJson = JsonSerializer.Serialize(eventDetail, _serializerOptions);

        var putEventsRequest = new PutEventsRequest
        {
            Entries =
            [
                new PutEventsRequestEntry()
                {
                    Source = "payment-stream-processor",
                    DetailType = detailType,
                    Detail = eventDetailJson,
                    EventBusName = _eventBusName
                }
            ]
        };

        var result = await _eventBridge.PutEventsAsync(putEventsRequest);
        
        var failedEntries = result.Entries.Where(e => !string.IsNullOrEmpty(e.ErrorCode)).ToList();
        if (failedEntries.Any())
        {
            throw new Exception($"Failed to send event: {failedEntries.First().ErrorCode}");
        }
    }
    
    private static string? GetAttributeValue(Dictionary<string, DynamoDBEvent.AttributeValue> attributes, string key)
    {
        if (attributes == null || !attributes.TryGetValue(key, out var attribute))
            return null;
            
        return attribute.S ?? attribute.N;
    }
}

public class BatchExcpetion : Exception
{
    public PaymentModel PaymentModel { get; set; }
    public BatchExcpetion(string message, PaymentModel result) : base(message)
    {
        PaymentModel = result;
    }
    
    public BatchExcpetion(PaymentModel result)
    {
        PaymentModel = result;
    }
}