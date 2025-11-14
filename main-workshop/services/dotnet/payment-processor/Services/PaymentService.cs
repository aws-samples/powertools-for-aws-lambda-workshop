global using LogLevel = Microsoft.Extensions.Logging.LogLevel;
using Amazon.DynamoDBv2;
using Amazon.DynamoDBv2.Model;
using Amazon.EventBridge;
using Amazon.EventBridge.Model;
using System.Text.Json;

[assembly: LambdaSerializer(typeof(Amazon.Lambda.Serialization.SystemTextJson.DefaultLambdaJsonSerializer))]

public class PaymentService
{
    private readonly IAmazonDynamoDB _dynamoDb;
    private readonly IAmazonEventBridge _eventBridge;
    private readonly string _paymentsTableName;
    private readonly string _eventBusName;
    private readonly JsonSerializerOptions _serializerOptions;
    private readonly Random _random = new();

    // Correlation ID for tracking requests across services
    public string? CorrelationId { get; set; }

    public PaymentService()
    {
        _dynamoDb = new AmazonDynamoDBClient();
        _eventBridge = new AmazonEventBridgeClient();
        _paymentsTableName = Environment.GetEnvironmentVariable("PAYMENTS_TABLE_NAME") ?? "Payments";
        _eventBusName = Environment.GetEnvironmentVariable("EVENT_BUS_NAME") ?? "";

        _serializerOptions = new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        };
    }

    public async Task<PaymentResult> ProcessPaymentAsync(DriverAssignedEvent driverEvent)
    {
        if (driverEvent == null)
        {
            throw new Exception("Failed to deserialize driver assigned event");
        }

        // Extract and store correlation ID
        CorrelationId = driverEvent.CorrelationId;

        return await ProcessPaymentInternalAsync(driverEvent);
    }

    private async Task<PaymentResult> ProcessPaymentInternalAsync(DriverAssignedEvent driverEvent)
    {
        var paymentId = Guid.NewGuid().ToString();

        // Create simple payment record
        var payment = new Payment
        {
            PaymentId = paymentId,
            RideId = driverEvent.RideId,
            RiderId = driverEvent.RiderId,
            DriverId = driverEvent.DriverId,
            Amount = driverEvent.EstimatedPrice,
            PaymentMethod = driverEvent.PaymentMethod,
            Status = "processing"
        };

        await CreatePaymentAsync(payment);

        // Simple payment processing
        var paymentResult = await ProcessPaymentAsync(payment);

        // Update payment status based on gateway result
        if (paymentResult.Success)
        {
            await UpdatePaymentStatusAsync(paymentId, "completed", paymentResult.TransactionId);

            // Only send PaymentCompleted event if payment succeeded
            await SendPaymentEventAsync(new
            {
                EventType = "PaymentCompleted",
                PaymentId = paymentId,
                RideId = driverEvent.RideId,
                RiderId = driverEvent.RiderId,
                DriverId = driverEvent.DriverId,
                Amount = payment.Amount,
                PaymentMethod = payment.PaymentMethod,
                TransactionId = paymentResult.TransactionId,
                Timestamp = DateTime.UtcNow,
                CorrelationId = CorrelationId
            });
        }
        else
        {
            // Update status to failed if payment gateway failed
            await UpdatePaymentStatusAsync(paymentId, "failed", null, paymentResult.ErrorMessage);
        }

        return new PaymentResult
        {
            Success = paymentResult.Success,
            Payment = payment,
            TransactionId = paymentResult.TransactionId,
            ErrorMessage = paymentResult.ErrorMessage,
            ProcessingTimeMs = paymentResult.ProcessingTimeMs
        };
    }

    private async Task<Payment> CreatePaymentAsync(Payment payment)
    {
        var item = SerializePayment(payment);

        var putRequest = new PutItemRequest
        {
            TableName = _paymentsTableName,
            Item = item
        };

        await _dynamoDb.PutItemAsync(putRequest);
        return payment;
    }

    private async Task<Payment?> UpdatePaymentStatusAsync(string paymentId, string status, string? transactionId = null, string? failureReason = null)
    {
        var updateExpression = "SET #status = :status, updatedAt = :updatedAt";
        var expressionAttributeNames = new Dictionary<string, string>
        {
            { "#status", "status" }
        };
        var expressionAttributeValues = new Dictionary<string, AttributeValue>
        {
            { ":status", new AttributeValue { S = status } },
            { ":updatedAt", new AttributeValue { S = DateTime.UtcNow.ToString("O") } }
        };

        if (!string.IsNullOrEmpty(transactionId))
        {
            updateExpression += ", transactionId = :transactionId";
            expressionAttributeValues[":transactionId"] = new AttributeValue { S = transactionId };
        }

        if (!string.IsNullOrEmpty(failureReason))
        {
            updateExpression += ", failureReason = :failureReason";
            expressionAttributeValues[":failureReason"] = new AttributeValue { S = failureReason };
        }

        var request = new UpdateItemRequest
        {
            TableName = _paymentsTableName,
            Key = new Dictionary<string, AttributeValue>
            {
                { "paymentId", new AttributeValue { S = paymentId } }
            },
            UpdateExpression = updateExpression,
            ExpressionAttributeNames = expressionAttributeNames,
            ExpressionAttributeValues = expressionAttributeValues,
            ReturnValues = ReturnValue.ALL_NEW
        };

        var response = await _dynamoDb.UpdateItemAsync(request);
        return DeserializePayment(response.Attributes);
    }

    private async Task<PaymentGatewayResult> ProcessPaymentAsync(Payment payment)
    {
        var stopwatch = System.Diagnostics.Stopwatch.StartNew();

        if (payment.PaymentMethod?.ToLower() == "somecompany-pay")
        {
            // Simulate additional processing time for SomeCompany Pay (5 seconds)
            await Task.Delay(5000);
        }
        else
        {
            await Task.Delay(100 + _random.Next(200));
        }

        stopwatch.Stop();
        var processingTimeMs = stopwatch.ElapsedMilliseconds;

        // Simulate 5% failure rate
        bool success = _random.Next(100) >= 5;
        string? transactionId = success ? $"txn_{Guid.NewGuid().ToString()[..8]}" : null;
        string? errorMessage = success ? null : "Payment gateway declined transaction";

        return new PaymentGatewayResult
        {
            Success = success,
            TransactionId = transactionId,
            ErrorMessage = errorMessage,
            ProcessingTimeMs = processingTimeMs
        };
    }

    private async Task SendPaymentEventAsync(object paymentEvent)
    {
        if (string.IsNullOrEmpty(_eventBusName))
        {
            return;
        }

        var eventDetailJson = JsonSerializer.Serialize(paymentEvent, _serializerOptions);

        // Extract event type from the payment event object for the DetailType
        var detailType = "PaymentEvent";
        if (paymentEvent is JsonElement element && element.TryGetProperty("eventType", out var eventTypeProperty))
        {
            detailType = eventTypeProperty.GetString() ?? "PaymentEvent";
        }
        else
        {
            // Try to get EventType from dynamic object or anonymous type
            var eventType = paymentEvent.GetType().GetProperty("EventType")?.GetValue(paymentEvent);
            if (eventType != null)
            {
                detailType = eventType.ToString() ?? "PaymentEvent";
            }
        }

        var putEventsRequest = new PutEventsRequest
        {
            Entries = new List<PutEventsRequestEntry>
            {
                new()
                {
                    Source = "payment-processor",
                    DetailType = detailType,
                    Detail = eventDetailJson,
                    EventBusName = _eventBusName
                }
            }
        };

        var result = await _eventBridge.PutEventsAsync(putEventsRequest);

        var failedEntries = result.Entries.Where(e => !string.IsNullOrEmpty(e.ErrorCode)).ToList();
        if (failedEntries.Any())
        {
            throw new Exception($"Failed to send event: {failedEntries.First().ErrorCode}");
        }
    }

    // Helper methods
    private static Payment DeserializePayment(Dictionary<string, AttributeValue> item)
    {
        return new Payment
        {
            PaymentId = item["paymentId"].S,
            RideId = item["rideId"].S,
            RiderId = item["riderId"].S,
            DriverId = item.ContainsKey("driverId") ? item["driverId"].S : string.Empty,
            Amount = decimal.Parse(item["amount"].N),
            PaymentMethod = item.ContainsKey("paymentMethod") ? item["paymentMethod"].S : "credit-card",
            Status = item["status"].S,
            FailureReason = item.ContainsKey("failureReason") ? item["failureReason"].S : null,
            TransactionId = item.ContainsKey("transactionId") ? item["transactionId"].S : null,
            CreatedAt = item["createdAt"].S,
            UpdatedAt = item["updatedAt"].S
        };
    }

    private Dictionary<string, AttributeValue> SerializePayment(Payment payment)
    {
        var item = new Dictionary<string, AttributeValue>
        {
            { "paymentId", new AttributeValue { S = payment.PaymentId } },
            { "rideId", new AttributeValue { S = payment.RideId } },
            { "riderId", new AttributeValue { S = payment.RiderId } },
            { "driverId", new AttributeValue { S = payment.DriverId } },
            { "amount", new AttributeValue { N = payment.Amount.ToString() } },
            { "paymentMethod", new AttributeValue { S = payment.PaymentMethod } },
            { "status", new AttributeValue { S = payment.Status } },
            { "createdAt", new AttributeValue { S = payment.CreatedAt } },
            { "updatedAt", new AttributeValue { S = payment.UpdatedAt } }
        };

        if (!string.IsNullOrEmpty(payment.FailureReason))
            item["failureReason"] = new AttributeValue { S = payment.FailureReason };

        if (!string.IsNullOrEmpty(payment.TransactionId))
            item["transactionId"] = new AttributeValue { S = payment.TransactionId };

        if (!string.IsNullOrEmpty(CorrelationId))
            item["correlationId"] = new AttributeValue { S = CorrelationId };

        return item;
    }
}