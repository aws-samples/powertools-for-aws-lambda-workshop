public class RushHourMultiplierService
{
    private readonly IAmazonSecretsManager _secretsManager;
    private readonly JsonSerializerOptions _serializerOptions;
    private readonly string _secretName;

    public RushHourMultiplierService()
    {
        _secretsManager = new AmazonSecretsManagerClient();
        _serializerOptions = new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        };
        
        // Get secret name from environment variable
        _secretName = Environment.GetEnvironmentVariable("RUSH_HOUR_MULTIPLIER_SECRET_NAME") 
                     ?? throw new InvalidOperationException("RUSH_HOUR_MULTIPLIER_SECRET_NAME environment variable is not set");
    }

    /// <summary>
    /// Retrieves the rush hour multiplier from AWS Secrets Manager using direct SDK calls.
    /// </summary>
    /// <returns>The rush hour multiplier value</returns>
    public async Task<decimal> GetRushHourMultiplierAsync()
    {
        var request = new GetSecretValueRequest
        {
            SecretId = _secretName
        };

        var response = await _secretsManager.GetSecretValueAsync(request);
        var secretData = JsonSerializer.Deserialize<SecretData>(response.SecretString, _serializerOptions);
            
        if (secretData == null)
        {
            throw new InvalidOperationException("Failed to deserialize secret data");
        }

        return secretData.RushHourMultiplier;
    }
}