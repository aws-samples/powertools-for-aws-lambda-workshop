using System.Text.Json.Serialization;

public class PaymentModel
{
    [JsonPropertyName("success")]
    public bool Success { get; set; }
    
    [JsonPropertyName("paymentId")]
    public string? PaymentId { get; set; }
    
    [JsonPropertyName("rideId")]
    public string? RideId { get; set; }
    
    [JsonPropertyName("riderId")]
    public string? RiderId { get; set; }
    
    [JsonPropertyName("driverId")]
    public string? DriverId { get; set; }
    
    [JsonPropertyName("correlationId")]
    public string? CorrelationId { get; set; }
    
    [JsonPropertyName("amount")]
    public string? Amount { get; set; }
    
    [JsonPropertyName("paymentMethod")]
    public string? PaymentMethod { get; set; }
    
    [JsonPropertyName("transactionId")]
    public string? TransactionId { get; set; }
    
    [JsonPropertyName("status")]
    public string? Status { get; set; }
}