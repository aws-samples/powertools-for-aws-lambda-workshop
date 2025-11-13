public class Function
{
    private readonly DriverMatchingService _driverMatchingService;

    public Function()
    {
        _driverMatchingService = new DriverMatchingService();
    }
    
    public async Task FunctionHandler(CloudWatchEvent<RideRequest> eventBridgeEvent, ILambdaContext context)
    {
        try
        {
            var result = await _driverMatchingService.ProcessRideRequestAsync(eventBridgeEvent.Detail);
            
            Console.WriteLine($"Found {result.AvailableDriversCount} available drivers");
            
            if (!result.Success)
            {
                Console.WriteLine($"[ERROR] No available drivers for ride {result.RideId}");
                return;
            }

            Console.WriteLine(
                $"Successfully assigned driver {result.AssignedDriverId} to ride {result.RideId} and sent event to payment processor");
        }
        catch (Exception ex)
        {
            Console.WriteLine(ex.Message);
            throw;
        }
    }
}