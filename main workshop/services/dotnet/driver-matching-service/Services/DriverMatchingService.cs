using Amazon.DynamoDBv2;
using Amazon.DynamoDBv2.Model;
using Amazon.EventBridge;
using Amazon.EventBridge.Model;
using System.Text.Json;

[assembly: LambdaSerializer(typeof(Amazon.Lambda.Serialization.SystemTextJson.DefaultLambdaJsonSerializer))]

public class DriverMatchingService
{
    private readonly IAmazonDynamoDB _dynamoDb;
    private readonly IAmazonEventBridge _eventBridge;
    private readonly string _driversTableName;
    private readonly string _ridesTableName;
    private readonly string _eventBusName;
    private readonly JsonSerializerOptions _serializerOptions;

    public DriverMatchingService()
    {
        _dynamoDb = new AmazonDynamoDBClient();
        _eventBridge = new AmazonEventBridgeClient();
        _driversTableName = Environment.GetEnvironmentVariable("DRIVERS_TABLE_NAME") ?? "Drivers";
        _ridesTableName = Environment.GetEnvironmentVariable("RIDES_TABLE_NAME") ?? "powertools-ride-workshop-Rides";
        _eventBusName = Environment.GetEnvironmentVariable("EVENT_BUS_NAME") ?? "";
        
        _serializerOptions = new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        };
    }
    
    public async Task<DriverMatchingResult> ProcessRideRequestAsync(RideRequest request)
    {
        if (request == null)
        {
            throw new Exception("Failed to deserialize ride request");
        }
        
        return await ProcessRideRequestInternalAsync(request);
    }

    private async Task<DriverMatchingResult> ProcessRideRequestInternalAsync(RideRequest request)
    {
        var result = new DriverMatchingResult
        {
            RideId = request.RideId,
            EstimatedPrice = request.EstimatedPrice
        };

        try
        {
            // Get available drivers
            var availableDrivers = await GetAvailableDriversAsync();
            result.AvailableDriversCount = availableDrivers.Count;

            if (!availableDrivers.Any())
            {
                await UpdateRideWithDriverAsync(request.RideId, "", "no-driver-available");
                result.Success = false;
                result.ErrorMessage = "No available drivers";
                return result;
            }

            var selectedDriver = availableDrivers.First();
            result.AssignedDriverId = selectedDriver.DriverId;
            
            // Update driver status to busy
            // Commented out for demo purposes - we don't need to track real status in the DB
            // await UpdateDriverStatusAsync(selectedDriver.DriverId, "busy");

            // Update ride with driver information and status
            await UpdateRideWithDriverAsync(request.RideId, selectedDriver.DriverId, "driver-assigned");
            
            // Send DriverAssignedEvent to payment processor
            var driverAssignedEvent = CreateDriverAssignedEvent(request, selectedDriver);
            await SendDriverAssignedEventAsync(driverAssignedEvent);

            result.Success = true;
            return result;
        }
        catch (Exception ex)
        {
            result.Success = false;
            result.ErrorMessage = ex.Message;
            throw; // Re-throw to mark message as failed for retry
        }
    }

    private async Task<List<Driver>> GetAvailableDriversAsync()
    {
        // For demo purposes: fetch all drivers without status filter
        var request = new ScanRequest
        {
            TableName = _driversTableName,
            // FilterExpression = "#status = :status",
            // ExpressionAttributeNames = new Dictionary<string, string>
            // {
            //     { "#status", "status" }
            // },
            // ExpressionAttributeValues = new Dictionary<string, AttributeValue>
            // {
            //     { ":status", new AttributeValue { S = "available" } }
            // }
        };

        var response = await _dynamoDb.ScanAsync(request);
            
        var drivers = new List<Driver>();
        foreach (var item in response.Items)
        {
            try
            {
                var driver = DeserializeDriver(item);
                drivers.Add(driver);
            }
            catch (Exception)
            {
                // ignored
            }
        }
            
        return drivers;
    }

    private async Task<bool> UpdateDriverStatusAsync(string driverId, string status)
    {
        var request = new UpdateItemRequest
        {
            TableName = _driversTableName,
            Key = new Dictionary<string, AttributeValue>
            {
                { "driverId", new AttributeValue { S = driverId } }
            },
            UpdateExpression = "SET #status = :status, updatedAt = :updatedAt",
            ExpressionAttributeNames = new Dictionary<string, string>
            {
                { "#status", "status" }
            },
            ExpressionAttributeValues = new Dictionary<string, AttributeValue>
            {
                { ":status", new AttributeValue { S = status } },
                { ":updatedAt", new AttributeValue { S = DateTime.UtcNow.ToString("O") } }
            }
        };

        await _dynamoDb.UpdateItemAsync(request);
        return true;
    }

    private async Task UpdateRideWithDriverAsync(string rideId, string driverId, string status)
    {
        var updateRequest = new UpdateItemRequest
        {
            TableName = _ridesTableName,
            Key = new Dictionary<string, AttributeValue>
            {
                { "rideId", new AttributeValue { S = rideId } }
            },
            UpdateExpression = "SET driverId = :driverId, #status = :status, updatedAt = :updatedAt",
            ExpressionAttributeNames = new Dictionary<string, string>
            {
                { "#status", "status" }
            },
            ExpressionAttributeValues = new Dictionary<string, AttributeValue>
            {
                { ":driverId", new AttributeValue { S = driverId } },
                { ":status", new AttributeValue { S = status } },
                { ":updatedAt", new AttributeValue { S = DateTime.UtcNow.ToString("O") } }
            }
        };

        await _dynamoDb.UpdateItemAsync(updateRequest);
    }

    private async Task SendDriverAssignedEventAsync(DriverAssignedEvent driverAssignedEvent)
    {
        if (string.IsNullOrEmpty(_eventBusName))
        {
            return;
        }

        var eventDetailJson = JsonSerializer.Serialize(driverAssignedEvent, _serializerOptions);

        var putEventsRequest = new PutEventsRequest
        {
            Entries = new List<PutEventsRequestEntry>
            {
                new()
                {
                    Source = "driver-matching-service",
                    DetailType = "DriverAssigned",
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
    private Driver DeserializeDriver(Dictionary<string, AttributeValue> item)
    {
        var currentLocation = ParseLocation(item);
        
        return new Driver
        {
            DriverId = item["driverId"].S,
            DriverName = GetDriverName(item),
            CurrentLocation = currentLocation,
            Status = item["status"].S,
            Rating = item.ContainsKey("rating") ? double.Parse(item["rating"].N) : 5.0,
            CreatedAt = item.ContainsKey("createdAt") ? item["createdAt"].S : DateTime.UtcNow.ToString("O"),
            UpdatedAt = GetUpdatedAt(item)
        };
    }

    private Location ParseLocation(Dictionary<string, AttributeValue> item)
    {
        if (item.ContainsKey("currentLocation") && !string.IsNullOrEmpty(item["currentLocation"].S))
        {
            try
            {
                return JsonSerializer.Deserialize<Location>(item["currentLocation"].S) ?? new Location();
            }
            catch (JsonException)
            {
                return new Location();
            }
        }
        
        if (item.ContainsKey("location") && !string.IsNullOrEmpty(item["location"].S))
        {
            try
            {
                return JsonSerializer.Deserialize<Location>(item["location"].S) ?? new Location();
            }
            catch (JsonException)
            {
                return new Location();
            }
        }
        
        return new Location();
    }

    private string GetDriverName(Dictionary<string, AttributeValue> item)
    {
        if (item.ContainsKey("driverName"))
            return item["driverName"].S;
        if (item.ContainsKey("name"))
            return item["name"].S;
        return "Unknown Driver";
    }

    private string GetUpdatedAt(Dictionary<string, AttributeValue> item)
    {
        if (item.ContainsKey("updatedAt"))
            return item["updatedAt"].S;
        if (item.ContainsKey("lastUpdated"))
            return item["lastUpdated"].S;
        return DateTime.UtcNow.ToString("O");
    }

    private DriverAssignedEvent CreateDriverAssignedEvent(RideRequest request, Driver driver)
    {
        return new DriverAssignedEvent
        {
            RideId = request.RideId,
            RiderId = request.RiderId,
            RiderName = request.RiderName,
            DriverId = driver.DriverId,
            DriverName = driver.DriverName,
            EstimatedPrice = request.EstimatedPrice,
            BasePrice = request.BasePrice,
            SurgeMultiplier = request.SurgeMultiplier,
            PickupLocation = request.PickupLocation,
            DropoffLocation = request.DropoffLocation,
            EstimatedArrivalMinutes = 0,
            DistanceKm = 0,
            PaymentMethod = request.PaymentMethod,
            Timestamp = DateTime.UtcNow,
            CorrelationId = request.CorrelationId,
        };
    }
}