using System.Text.Json.Serialization;

public class RideCompletionResult
{
    [JsonPropertyName("paymentId")]
    public string PaymentId { get; set; } = string.Empty;
    
    [JsonPropertyName("rideId")]
    public string RideId { get; set; } = string.Empty;
    
    [JsonPropertyName("driverId")]
    public string DriverId { get; set; } = string.Empty;
    
    [JsonPropertyName("rideUpdateSuccessful")]
    public bool RideUpdateSuccessful { get; set; }
    
    [JsonPropertyName("driverUpdateSuccessful")]
    public bool DriverUpdateSuccessful { get; set; }
    
    [JsonPropertyName("success")]
    public bool Success { get; set; }
    
    [JsonPropertyName("errorMessage")]
    public string ErrorMessage { get; set; } = string.Empty;
    
    [JsonPropertyName("errorType")]
    public string ErrorType { get; set; } = string.Empty;

    [JsonPropertyName("riderId")]
    public string RiderId { get; set; }

    [JsonPropertyName("paymentMethod")]
    public string PaymentMethod { get; set; } = string.Empty;

    [JsonPropertyName("amount")]
    public decimal Amount { get; set; }
}