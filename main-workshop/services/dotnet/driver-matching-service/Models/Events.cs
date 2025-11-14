using System.Text.Json.Serialization;

// Input event from dynamic-pricing-service
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

    [JsonPropertyName("distance")]
    public double Distance { get; set; }

    [JsonPropertyName("paymentMethod")]
    public string PaymentMethod { get; set; } = "credit-card";

    [JsonPropertyName("timestamp")]
    public DateTime Timestamp { get; set; }

    [JsonPropertyName("correlationId")]
    public string? CorrelationId { get; set; }

    override public string ToString() => RideId;
}

// Event sent to payment processor after driver assignment
public class DriverAssignedEvent
{
    [JsonPropertyName("eventType")]
    public string EventType { get; set; } = "DriverAssigned";
    
    [JsonPropertyName("rideId")]
    public string RideId { get; set; } = string.Empty;
    
    [JsonPropertyName("riderId")]
    public string RiderId { get; set; } = string.Empty;
    
    [JsonPropertyName("riderName")]
    public string RiderName { get; set; } = string.Empty;
    
    [JsonPropertyName("driverId")]
    public string DriverId { get; set; } = string.Empty;
    
    [JsonPropertyName("driverName")]
    public string DriverName { get; set; } = string.Empty;
    
    [JsonPropertyName("estimatedPrice")]
    public decimal EstimatedPrice { get; set; }
    
    [JsonPropertyName("basePrice")]
    public decimal BasePrice { get; set; }
    
    [JsonPropertyName("surgeMultiplier")]
    public decimal SurgeMultiplier { get; set; }
    
    [JsonPropertyName("pickupLocation")]
    public Location PickupLocation { get; set; } = new();
    
    [JsonPropertyName("dropoffLocation")]
    public Location DropoffLocation { get; set; } = new();
    
    [JsonPropertyName("estimatedArrivalMinutes")]
    public int EstimatedArrivalMinutes { get; set; }
    
    [JsonPropertyName("distanceKm")]
    public double DistanceKm { get; set; }

    [JsonPropertyName("paymentMethod")]
    public string PaymentMethod { get; set; } = "credit-card";
    
    [JsonPropertyName("timestamp")]
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;

    [JsonPropertyName("correlationId")]
    public string? CorrelationId { get; set; }
}