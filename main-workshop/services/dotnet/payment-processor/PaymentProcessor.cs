/*
 * This file is part of the Payment Processor service.
 * Update this file in the Module 2 Idempotency exercise.
 */

public class PaymentProcessor
{
    private readonly PaymentService _paymentService;

    public PaymentProcessor()
    {
        _paymentService = new PaymentService();
    }

    public async Task<PaymentResult> HandlePaymentAsync(DriverAssignedEvent driverEvent)
    {
        var result = await _paymentService.ProcessPaymentAsync(driverEvent);

        if (result.Success)
        {
            Logger.AppendKey("PaymentAmount", result.Payment.Amount);
            Logger.AppendKey("PaymentMethod", result.Payment.PaymentMethod);
            Logger.LogInformation("Payment created for rideId: {rideId} paymentId: {paymentId}",
                result.Payment.RideId, result.Payment.PaymentId);
        }
        
        return result;
    }
}