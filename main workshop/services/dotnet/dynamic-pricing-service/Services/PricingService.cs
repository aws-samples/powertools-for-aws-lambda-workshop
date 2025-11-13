using Amazon.DynamoDBv2;
using Amazon.DynamoDBv2.Model;
using Amazon.EventBridge;
using Amazon.EventBridge.Model;
using System.Text.Json;

[assembly: LambdaSerializer(typeof(Amazon.Lambda.Serialization.SystemTextJson.DefaultLambdaJsonSerializer))]

public class PricingService
{
    private readonly IAmazonDynamoDB _dynamoDb;
    private readonly IAmazonEventBridge _eventBridge;
    private readonly string _tableName;
    private readonly string _eventBusName;
    private readonly JsonSerializerOptions _serializerOptions;
    private readonly Random _random;

    // Pricing constants
    private const decimal MIN_BASE_PRICE = 5.0m;
    private const decimal MAX_BASE_PRICE = 20.0m;

    public PricingService()
    {
        _dynamoDb = new AmazonDynamoDBClient();
        _eventBridge = new AmazonEventBridgeClient();
        _tableName = Environment.GetEnvironmentVariable("PRICING_TABLE_NAME") ?? "Pricing";
        _eventBusName = Environment.GetEnvironmentVariable("EVENT_BUS_NAME") ?? "";
        _random = new Random();
        
        _serializerOptions = new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        };
    }



    public async Task<PricingResult> ProcessRideForPricing(RideCreatedEvent rideCreatedEvent, decimal rushHourMultiplier)
    {
        var result = new PricingResult
        {
            RideId = rideCreatedEvent.RideId,
            RiderId = rideCreatedEvent.RiderId
        };

        try
        {
            // Calculate price using simplified pricing rules
            var priceCalculation = CalculatePrice(rushHourMultiplier);

            // Save price calculation to database
            await SavePriceCalculationAsync(rideCreatedEvent.RideId, priceCalculation);

            // Send ride request to driver matching service
            var rideRequest = CreateRideRequest(rideCreatedEvent, priceCalculation);
            await SendPriceCalculatedEventAsync(rideRequest);

            result.Success = true;
            result.FinalPrice = priceCalculation.FinalPrice;
            result.BasePrice = priceCalculation.BasePrice;
            result.SurgeMultiplier = priceCalculation.SurgeMultiplier;
    
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

    private PriceCalculation CalculatePrice(decimal rushHourMultiplier)
    {
        var basePrice = (decimal)(_random.NextDouble() * (double)(MAX_BASE_PRICE - MIN_BASE_PRICE) + (double)MIN_BASE_PRICE);
        basePrice = Math.Round(basePrice, 2);
        var finalPrice = Math.Round(basePrice * rushHourMultiplier, 2);

        return new PriceCalculation
        {
            BasePrice = basePrice,
            SurgeMultiplier = rushHourMultiplier,
            FinalPrice = finalPrice,
            CreatedAt = DateTime.UtcNow.ToString("O")
        };
    }

    private async Task SavePriceCalculationAsync(string rideId, PriceCalculation calculation)
    {
        var item = new Dictionary<string, AttributeValue>
        {
            { "rideId", new AttributeValue { S = rideId } },
            { "basePrice", new AttributeValue { N = calculation.BasePrice.ToString("F2") } },
            { "finalPrice", new AttributeValue { N = calculation.FinalPrice.ToString("F2") } },
            { "surgeMultiplier", new AttributeValue { N = calculation.SurgeMultiplier.ToString("F2") } },
            { "createdAt", new AttributeValue { S = calculation.CreatedAt } }
        };
        
        var putRequest = new PutItemRequest
        {
            TableName = _tableName,
            Item = item
        };

        await _dynamoDb.PutItemAsync(putRequest);
    }

    private async Task<string> SendPriceCalculatedEventAsync(RideRequest rideRequest)
    {
        if (string.IsNullOrEmpty(_eventBusName))
        {
            return "Event bus name is empty - skipping event";
        }

        var eventDetailJson = JsonSerializer.Serialize(rideRequest, _serializerOptions);

        var putEventsRequest = new PutEventsRequest
        {
            Entries = new List<PutEventsRequestEntry>
            {
                new PutEventsRequestEntry
                {
                    Source = "dynamic-pricing-service",
                    DetailType = "PriceCalculated",
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

        return $"Successfully sent PriceCalculated event. EventId: {result.Entries[0].EventId}";
    }

    private RideRequest CreateRideRequest(RideCreatedEvent rideEvent, PriceCalculation priceCalculation)
    {
        return new RideRequest
        {
            RideId = rideEvent.RideId,
            RiderId = rideEvent.RiderId,
            RiderName = rideEvent.RiderName,
            PickupLocation = rideEvent.PickupLocation,
            DropoffLocation = rideEvent.DestinationLocation,
            EstimatedPrice = priceCalculation.FinalPrice,
            BasePrice = priceCalculation.BasePrice,
            SurgeMultiplier = priceCalculation.SurgeMultiplier,
            PaymentMethod = rideEvent.PaymentMethod,
            Timestamp = DateTime.UtcNow,
            CorrelationId = rideEvent.CorrelationId
        };
    }

    // Event processing methods

    public async Task<PricingResult> ProcessRideCreatedEventAsync(CloudWatchEvent<RideCreatedEvent> eventBridgeEvent, decimal rushHourMultiplier)
    {
        var result = new PricingResult();

        try
        {
            var rideCreatedEvent = eventBridgeEvent.Detail;

            if (rideCreatedEvent == null)
            {
                result.Success = false;
                result.ErrorType = "DeserializationError";
                result.ErrorMessage = "Failed to deserialize ride created event";
                return result;
            }
            
            if (rideCreatedEvent.PickupLocation == null || rideCreatedEvent.DestinationLocation == null)
            {
                result.Success = false;
                result.ErrorType = "ValidationError";
                result.ErrorMessage = "Missing pickup or destination location";
                result.RideId = rideCreatedEvent.RideId;
                result.RiderId = rideCreatedEvent.RiderId;
                return result;
            }

            // Process the ride for pricing
            return await ProcessRideForPricing(rideCreatedEvent, rushHourMultiplier);
        }
        catch (JsonException ex)
        {
            result.Success = false;
            result.ErrorType = "JsonException";
            result.ErrorMessage = ex.Message;
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
}