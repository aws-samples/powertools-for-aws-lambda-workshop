using Amazon.DynamoDBv2;
using Amazon.DynamoDBv2.Model;
using Amazon.EventBridge;
using Amazon.EventBridge.Model;
using System.Text.Json;

[assembly: LambdaSerializer(typeof(Amazon.Lambda.Serialization.SystemTextJson.DefaultLambdaJsonSerializer))]

public class RideService
{
    private readonly IAmazonDynamoDB _dynamoDb;
    private readonly IAmazonEventBridge _eventBridge;
    private readonly string _tableName;
    private readonly string _eventBusName;
    private readonly JsonSerializerOptions _serializeOptions;

    public RideService()
    {
        _dynamoDb = new AmazonDynamoDBClient();
        _eventBridge = new AmazonEventBridgeClient();
        _tableName = Environment.GetEnvironmentVariable("RIDES_TABLE_NAME") ?? "Rides";
        _eventBusName = Environment.GetEnvironmentVariable("EVENT_BUS_NAME") ?? "";
        
        _serializeOptions = new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            WriteIndented = false
        };
    }

    public async Task<RideCreationResult> CreateRideAsync(APIGatewayProxyRequest request, string? deviceId = null)
    {
        var result = new RideCreationResult();

        try
        {
            // Extract correlation ID from request headers
            var correlationId = request.Headers?.GetValue("x-correlation-id");
            if (string.IsNullOrEmpty(correlationId))
            {
                correlationId = null;
            }

            // Deserialize request
            var createRequest = JsonSerializer.Deserialize<CreateRideRequest>(request.Body, _serializeOptions);
            if (createRequest == null)
            {
                result.Success = false;
                result.ErrorType = "InvalidRequest";
                result.ErrorMessage = "Invalid request format";
                return result;
            }

            // Create ride object
            var ride = new Ride
            {
                RideId = Guid.NewGuid().ToString(),
                RiderId = createRequest.RiderId,
                RiderName = createRequest.RiderName,
                PickupLocation = createRequest.PickupLocation,
                DestinationLocation = createRequest.DestinationLocation,
                PaymentMethod = createRequest.PaymentMethod,
                DeviceId = deviceId, // Store device ID with the ride
                Status = "requested",
                CreatedAt = DateTime.UtcNow.ToString("O"),
                UpdatedAt = DateTime.UtcNow.ToString("O")
            };

            // Save to DynamoDB
            await SaveRideToDynamoDbAsync(ride);

            // Send event to EventBridge with correlation ID
            await SendRideCreatedEventAsync(ride, correlationId);

            result.Success = true;
            result.Ride = ride;
            return result;
        }
        catch (JsonException)
        {
            result.Success = false;
            result.ErrorType = "JsonException";
            result.ErrorMessage = "Invalid JSON format";
            return result;
        }
        catch (Exception ex)
        {
            result.Success = false;
            result.ErrorType = "UnexpectedError";
            result.ErrorMessage = ex.Message;
            throw;
        }
    }

    private async Task SaveRideToDynamoDbAsync(Ride ride)
    {
        var item = new Dictionary<string, AttributeValue>
        {
            { "rideId", new AttributeValue { S = ride.RideId } },
            { "riderId", new AttributeValue { S = ride.RiderId } },
            { "riderName", new AttributeValue { S = ride.RiderName } },
            { "pickupLocation", new AttributeValue { S = JsonSerializer.Serialize(ride.PickupLocation) } },
            { "destinationLocation", new AttributeValue { S = JsonSerializer.Serialize(ride.DestinationLocation) } },
            { "paymentMethod", new AttributeValue { S = ride.PaymentMethod } },
            { "deviceId", new AttributeValue { S = ride.DeviceId ?? "unknown" } },
            { "status", new AttributeValue { S = ride.Status } },
            { "createdAt", new AttributeValue { S = ride.CreatedAt } },
            { "updatedAt", new AttributeValue { S = ride.UpdatedAt } }
        };

        var putRequest = new PutItemRequest
        {
            TableName = _tableName,
            Item = item
        };

        await _dynamoDb.PutItemAsync(putRequest);
    }

    private async Task SendRideCreatedEventAsync(Ride ride, string correlationId)
    {
        if (string.IsNullOrEmpty(_eventBusName))
        {
            return;
        }

        var rideCreatedEvent = new RideCreatedEvent
        {
            RideId = ride.RideId,
            RiderId = ride.RiderId,
            RiderName = ride.RiderName,
            PickupLocation = ride.PickupLocation,
            DestinationLocation = ride.DestinationLocation,
            PaymentMethod = ride.PaymentMethod,
            Timestamp = DateTime.UtcNow,
            EventType = "RideCreated",
            CorrelationId = correlationId
        };

        var eventDetailJson = JsonSerializer.Serialize(rideCreatedEvent, _serializeOptions);

        var putEventsRequest = new PutEventsRequest
        {
            Entries = new List<PutEventsRequestEntry>
            {
                new PutEventsRequestEntry
                {
                    Source = "ride-service",
                    DetailType = "RideCreated",
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
}

public static class Extensions
{
    public static string GetValue(this IDictionary<string,string> dict, string key)
    {
        return dict.TryGetValue(key, out var value) ? value : string.Empty;
    }
}