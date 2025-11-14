using System.Text.Json.Serialization;

public class DriverMatchingResult
{
    [JsonPropertyName("rideId")]
    public string RideId { get; set; } = string.Empty;
    
    [JsonPropertyName("estimatedPrice")]
    public decimal EstimatedPrice { get; set; }
    
    [JsonPropertyName("availableDriversCount")]
    public int AvailableDriversCount { get; set; }
    
    [JsonPropertyName("assignedDriverId")]
    public string AssignedDriverId { get; set; } = string.Empty;
    
    [JsonPropertyName("success")]
    public bool Success { get; set; }
    
    [JsonPropertyName("errorMessage")]
    public string ErrorMessage { get; set; } = string.Empty;
}