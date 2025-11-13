using System.Text.Json.Serialization;

public class RideEvent
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

    [JsonPropertyName("paymentMethod")]
    public string PaymentMethod { get; set; } = "credit-card";

    [JsonPropertyName("timestamp")]
    public DateTime Timestamp { get; set; }
}
