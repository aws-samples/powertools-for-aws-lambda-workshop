using System.Text.Json.Serialization;

public class Payment
{
    [JsonPropertyName("paymentId")]
    public string PaymentId { get; set; } = string.Empty;

    [JsonPropertyName("rideId")]
    public string RideId { get; set; } = string.Empty;

    [JsonPropertyName("riderId")]
    public string RiderId { get; set; } = string.Empty;

    [JsonPropertyName("driverId")]
    public string DriverId { get; set; } = string.Empty;

    [JsonPropertyName("amount")]
    public decimal Amount { get; set; }

    [JsonPropertyName("paymentMethod")]
    public string PaymentMethod { get; set; } = "credit-card";

    [JsonPropertyName("status")]
    public string Status { get; set; } = "pending"; // pending, processing, completed, failed

    [JsonPropertyName("failureReason")]
    public string? FailureReason { get; set; }

    [JsonPropertyName("transactionId")]
    public string? TransactionId { get; set; }

    [JsonPropertyName("createdAt")]
    public string CreatedAt { get; set; } = DateTime.UtcNow.ToString("O");

    [JsonPropertyName("updatedAt")]
    public string UpdatedAt { get; set; } = DateTime.UtcNow.ToString("O");
}

public class DriverAssignedEvent
{
    [JsonPropertyName("eventType")]
    public string EventType { get; set; } = string.Empty;
    
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

    [JsonPropertyName("paymentMethod")]
    public string PaymentMethod { get; set; } = "credit-card";
    
    [JsonPropertyName("timestamp")]
    public DateTime Timestamp { get; set; }

    [JsonPropertyName("correlationId")]
    public string? CorrelationId { get; set; }
}