using System.Text.Json.Serialization;

/// <summary>
/// Represents a payment completion event received from EventBridge
/// </summary>
public class PaymentCompletedEvent
{
    /// <summary>
    /// Unique identifier for the payment
    /// </summary>
    [JsonPropertyName("paymentId")]
    public string PaymentId { get; set; } = string.Empty;

    /// <summary>
    /// Unique identifier for the ride associated with the payment
    /// </summary>
    [JsonPropertyName("rideId")]
    public string RideId { get; set; } = string.Empty;

    /// <summary>
    /// Unique identifier for the rider who made the payment
    /// </summary>
    [JsonPropertyName("riderId")]
    public string RiderId { get; set; } = string.Empty;

    /// <summary>
    /// Unique identifier for the driver who completed the ride
    /// </summary>
    [JsonPropertyName("driverId")]
    public string DriverId { get; set; } = string.Empty;

    /// <summary>
    /// Payment amount
    /// </summary>
    [JsonPropertyName("amount")]
    public decimal Amount { get; set; }

    /// <summary>
    /// Payment method used (e.g., credit-card, somecompany-pay, etc.)
    /// </summary>
    [JsonPropertyName("paymentMethod")]
    public string PaymentMethod { get; set; } = string.Empty;

    /// <summary>
    /// Unique identifier for the payment transaction
    /// </summary>
    [JsonPropertyName("transactionId")]
    public string TransactionId { get; set; } = string.Empty;

    /// <summary>
    /// ISO8601 timestamp when the payment was completed
    /// </summary>
    [JsonPropertyName("timestamp")]
    public string Timestamp { get; set; } = string.Empty;

    /// <summary>
    /// Correlation ID for tracking requests across services
    /// </summary>
    [JsonPropertyName("correlationId")]
    public string? CorrelationId { get; set; }
}