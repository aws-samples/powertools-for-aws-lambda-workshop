using System.Text.Json.Serialization;

public class PricingResult
{
    [JsonPropertyName("rideId")]
    public string RideId { get; set; } = string.Empty;
    
    [JsonPropertyName("riderId")]
    public string RiderId { get; set; } = string.Empty;
    
    [JsonPropertyName("finalPrice")]
    public decimal FinalPrice { get; set; }
    
    [JsonPropertyName("basePrice")]
    public decimal BasePrice { get; set; }
    
    [JsonPropertyName("surgeMultiplier")]
    public decimal SurgeMultiplier { get; set; }
    
    [JsonPropertyName("success")]
    public bool Success { get; set; }
    
    [JsonPropertyName("errorMessage")]
    public string ErrorMessage { get; set; } = string.Empty;
    
    [JsonPropertyName("errorType")]
    public string ErrorType { get; set; } = string.Empty;
}