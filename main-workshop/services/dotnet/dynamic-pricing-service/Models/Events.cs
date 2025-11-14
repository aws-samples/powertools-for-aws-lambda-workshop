using System.Text.Json.Serialization;

public class RideCreatedEvent
{
    [JsonPropertyName("rideId")]
    public string RideId { get; set; } = string.Empty;

    [JsonPropertyName("riderId")]
    public string RiderId { get; set; } = string.Empty;

    [JsonPropertyName("riderName")]
    public string RiderName { get; set; } = string.Empty;

    [JsonPropertyName("pickupLocation")]
    public Location PickupLocation { get; set; } = new();

    [JsonPropertyName("destinationLocation")]
    public Location DestinationLocation { get; set; } = new();

    [JsonPropertyName("paymentMethod")]
    public string PaymentMethod { get; set; } = "credit-card";

    [JsonPropertyName("timestamp")]
    public DateTime Timestamp { get; set; }

    [JsonPropertyName("eventType")]
    public string EventType { get; set; } = "RideCreated";

    [JsonPropertyName("correlationId")]
    public string? CorrelationId { get; set; }
}

// Output event to driver-matching-service
public class RideRequest
{
    [JsonPropertyName("rideId")]
    public string RideId { get; set; } = string.Empty;

    [JsonPropertyName("riderId")]
    public string RiderId { get; set; } = string.Empty;

    [JsonPropertyName("riderName")]
    public string RiderName { get; set; } = string.Empty;

    [JsonPropertyName("pickupLocation")]
    public Location PickupLocation { get; set; } = new();

    [JsonPropertyName("dropoffLocation")]
    public Location DropoffLocation { get; set; } = new();

    [JsonPropertyName("estimatedPrice")]
    public decimal EstimatedPrice { get; set; }

    [JsonPropertyName("basePrice")]
    public decimal BasePrice { get; set; }

    [JsonPropertyName("surgeMultiplier")]
    public decimal SurgeMultiplier { get; set; }

    [JsonPropertyName("paymentMethod")]
    public string PaymentMethod { get; set; } = "credit-card";

    [JsonPropertyName("timestamp")]
    public DateTime Timestamp { get; set; }

    [JsonPropertyName("correlationId")]
    public string? CorrelationId { get; set; }
}