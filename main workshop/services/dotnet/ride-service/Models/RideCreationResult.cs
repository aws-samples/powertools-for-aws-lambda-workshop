using System.Text.Json.Serialization;



public class RideCreationResult
{
    [JsonPropertyName("ride")] 
    public Ride Ride { get; set; }
    
    [JsonPropertyName("success")]
    public bool Success { get; set; }
    
    [JsonPropertyName("errorMessage")]
    public string ErrorMessage { get; set; } = string.Empty;
    
    [JsonPropertyName("errorType")]
    public string ErrorType { get; set; } = string.Empty;
}