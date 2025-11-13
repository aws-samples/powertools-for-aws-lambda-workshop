using System.Text.Json.Serialization;

public class Location
{
    [JsonPropertyName("address")]
    public string Address { get; set; } = string.Empty;

    [JsonPropertyName("latitude")]
    public double Latitude { get; set; }

    [JsonPropertyName("longitude")]
    public double Longitude { get; set; }
}

public class PriceCalculation
{
    [JsonPropertyName("basePrice")]
    public decimal BasePrice { get; set; }

    [JsonPropertyName("finalPrice")]
    public decimal FinalPrice { get; set; }

    [JsonPropertyName("surgeMultiplier")]
    public decimal SurgeMultiplier { get; set; } = 1.0m;

    [JsonPropertyName("createdAt")]
    public string CreatedAt { get; set; } = DateTime.UtcNow.ToString("O");
}
