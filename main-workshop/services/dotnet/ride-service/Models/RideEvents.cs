using System.Text.Json.Serialization;


// Event sent to pricing service when a ride is created
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
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;

    [JsonPropertyName("eventType")]
    public string EventType { get; set; } = "RideCreated";

    [JsonPropertyName("correlationId")]
    public string? CorrelationId { get; set; }
}