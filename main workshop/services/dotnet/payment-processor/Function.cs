public class Function
{
    private readonly PaymentHandler _paymentHandler;

    public Function()
    {
        _paymentHandler = new PaymentHandler();
    }
    
    public async Task FunctionHandler(CloudWatchEvent<DriverAssignedEvent> eventBridgeEvent, ILambdaContext context)
    {
        try
        {
            var result = await _paymentHandler.HandlePaymentAsync(eventBridgeEvent.Detail);
            
            if (result.Success)
            {
                Console.WriteLine(
                    $"Payment completed successfully: {result.Payment?.PaymentId} for ${result.Payment?.Amount}");
            }
            else
            {
                Console.WriteLine($"Payment failed: {result.ErrorMessage}");
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine(ex);
            throw;
        }
    }
}