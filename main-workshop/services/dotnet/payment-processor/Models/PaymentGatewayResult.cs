using System.Text.Json.Serialization;

public class PaymentGatewayResult
{
    [JsonPropertyName("success")]
    public bool Success { get; set; }
    [JsonPropertyName("transactionId")]
    public string? TransactionId { get; set; }
    [JsonPropertyName("errorMessage")]
    public string? ErrorMessage { get; set; }
    [JsonPropertyName("processingTimeMs")]
    public long ProcessingTimeMs { get; set; }
}