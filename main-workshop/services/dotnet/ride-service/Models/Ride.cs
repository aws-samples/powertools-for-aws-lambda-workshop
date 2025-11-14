using System.Text.Json.Serialization;



public class Ride
{
    [JsonPropertyName("rideId")]
    public string RideId { get; set; } = string.Empty;

    [JsonPropertyName("riderId")]
    public string RiderId { get; set; } = string.Empty;

    [JsonPropertyName("riderName")]
    public string RiderName { get; set; } = string.Empty;

    [JsonPropertyName("pickupLocation")]
    public Location PickupLocation { get; set; } = new();

    [JsonPropertyName("destinationLocation")]
    public Location DestinationLocation { get; set; } = new();

    // Linear status flow: requested → driver-assigned → in-progress → completed (or cancelled)
    [JsonPropertyName("status")]
    public string Status { get; set; } = "requested";

    [JsonPropertyName("driverId")]
    public string? DriverId { get; set; }

    [JsonPropertyName("driverName")]
    public string? DriverName { get; set; }

    [JsonPropertyName("finalPrice")]
    public decimal? FinalPrice { get; set; }

    [JsonPropertyName("paymentMethod")]
    public string PaymentMethod { get; set; } = "credit-card";

    [JsonPropertyName("createdAt")]
    public string CreatedAt { get; set; } = DateTime.UtcNow.ToString("O");

    [JsonPropertyName("updatedAt")]
    public string UpdatedAt { get; set; } = DateTime.UtcNow.ToString("O");

    [JsonPropertyName("deviceId")]
    public string? DeviceId { get; set; }

    override public string ToString() => RiderId;
}

public class Location
{
    [JsonPropertyName("address")]
    public string Address { get; set; } = string.Empty;

    [JsonPropertyName("latitude")]
    public double Latitude { get; set; }

    [JsonPropertyName("longitude")]
    public double Longitude { get; set; }
}

public class CreateRideRequest
{
    [JsonPropertyName("riderId")]
    public string RiderId { get; set; } = string.Empty;

    [JsonPropertyName("riderName")]
    public string RiderName { get; set; } = string.Empty;

    [JsonPropertyName("pickupLocation")]
    public Location PickupLocation { get; set; } = new();

    [JsonPropertyName("destinationLocation")]
    public Location DestinationLocation { get; set; } = new();

    [JsonPropertyName("paymentMethod")]
    public string PaymentMethod { get; set; } = "credit-card"; // credit-card, cash, somecompany-pay
}


