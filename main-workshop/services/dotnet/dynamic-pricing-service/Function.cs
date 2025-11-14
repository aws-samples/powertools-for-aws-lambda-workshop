public class Function
{
    private readonly PricingService _pricingService;
    private readonly RushHourMultiplierService _rushHourMultiplierService;

    public Function()
    {
        _pricingService = new PricingService();
        _rushHourMultiplierService = new RushHourMultiplierService();
    }
    
    public async Task FunctionHandler(CloudWatchEvent<RideCreatedEvent> eventBridgeEvent, ILambdaContext context)
    {
        try
        {
            // Retrieve rush hour multiplier from Secrets Manager
            var rushHourMultiplier = await _rushHourMultiplierService.GetRushHourMultiplierAsync();

            Console.WriteLine("Retrieved rush hour multiplier: " + rushHourMultiplier);

            var result = await _pricingService.ProcessRideCreatedEventAsync(eventBridgeEvent, rushHourMultiplier);
            
            if (!result.Success)
            {
                Console.WriteLine($"[ERROR] PRICING_FAILURE: {result.ErrorMessage}");
                return;
            }

            Console.WriteLine($"Successfully processed pricing for ride {result.RideId}");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[ERROR] PRICING_ERROR: {ex.Message}");
            throw;
        }
    }
}