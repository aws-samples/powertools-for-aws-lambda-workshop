using System.Text.Json.Serialization;

public class PaymentResult
{
    [JsonPropertyName("success")]
    public bool Success { get; set; }
    [JsonPropertyName("payment")]
    public Payment Payment { get; set; }
    [JsonPropertyName("transactionId")]
    public string? TransactionId { get; set; }
    [JsonPropertyName("errorMessage")]
    public string? ErrorMessage { get; set; }
    [JsonPropertyName("processingTimeMs")]
    public long ProcessingTimeMs { get; set; }
    [JsonPropertyName("cachedResponse")]
    public bool CachedResponse { get; set; }

    [JsonPropertyName("cacheExpiration")]
    public long? CacheExpiration { get; set; }
}