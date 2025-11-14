public class Function
{
    private readonly RideService _rideService;

    public Function()
    {
        _rideService = new RideService();
    }

    public async Task<APIGatewayProxyResponse> FunctionHandler(APIGatewayProxyRequest request, ILambdaContext context)
    {
        try
        {
            if (!RideRouteHandler.IsCreateRideRequest(request)) return RideRouteHandler.NotFound("Endpoint not found");

            if (string.IsNullOrEmpty(request.Body))
                return RideRouteHandler.BadRequest("Request body is required");

            var deviceId = GetDeviceIdFromHeaders(request.Headers);
            var result = await _rideService.CreateRideAsync(request, deviceId);

            if (!result.Success)
            {
                Console.WriteLine($"Error creating ride: {result.ErrorMessage}");
                return RideRouteHandler.HandleError();
            }

            Console.WriteLine($"Ride created successfully for rider {result.Ride.RiderId}");

            return RideRouteHandler.Created(result.Ride);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Unexpected error: {ex.Message}");
            return RideRouteHandler.HandleError();
        }
    }

    private string? GetDeviceIdFromHeaders(IDictionary<string?, string>? headers)
    {
        try
        {
            // Check for device ID header (case-insensitive)
            var deviceIdKey = headers?.Keys.First(k =>
                string.Equals(k, "x-device-id", StringComparison.OrdinalIgnoreCase));

            return headers?[deviceIdKey];
        }
        catch(Exception ex)
        {
            throw new Exception("Header not found", ex);
        }
    }
}