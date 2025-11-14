using System.Text.Json.Serialization;

/// <summary>
/// Model class for rush hour multiplier configuration stored in AWS Secrets Manager
/// </summary>
public class SecretData
{
    /// <summary>
    /// The multiplier value applied during rush hour periods
    /// </summary>
    [JsonPropertyName("rushHourMultiplier")]
    public decimal RushHourMultiplier { get; set; }

    /// <summary>
    /// Timestamp indicating when the configuration was last updated
    /// </summary>
    [JsonPropertyName("lastUpdated")]
    public DateTime LastUpdated { get; set; }

    /// <summary>
    /// Human-readable description of the configuration
    /// </summary>
    [JsonPropertyName("description")]
    public string Description { get; set; } = string.Empty;
}