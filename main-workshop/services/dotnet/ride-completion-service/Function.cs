public class Function
{
    private readonly RideCompletionService _rideCompletionService;

    public Function()
    {
        _rideCompletionService = new RideCompletionService();
    }
    
    public async Task HandlePaymentCompletedEvent(CloudWatchEvent<PaymentCompletedEvent> cloudWatchEvent, ILambdaContext context)
    {
        try
        {
            var result = await _rideCompletionService.ProcessPaymentCompletedEventAsync(cloudWatchEvent);

            if (!result.Success)
            {
                Console.WriteLine(
                    $"ERROR: Failed to process payment event - PaymentId: {result.PaymentId}, RideId: {result.RideId}, DriverId: {result.DriverId}, ErrorType: {result.ErrorType}, Error: {result.ErrorMessage}");
                return;
            }

            Console.WriteLine(
                $"Payment event processing completed successfully - PaymentId: {result.PaymentId}, RideId: {result.RideId}, DriverId: {result.DriverId}, RideUpdateSuccessful: {result.RideUpdateSuccessful}, DriverUpdateSuccessful: {result.DriverUpdateSuccessful}");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"ERROR: Unexpected error processing payment event - Error: {ex.Message}");
            throw;
        }
    }
}