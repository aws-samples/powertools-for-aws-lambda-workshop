// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

using System;
using System.IO;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Amazon.Rekognition;
using Amazon.Rekognition.Model;
using Amazon.SecretsManager;
using Amazon.SecretsManager.Model;
using AWS.Lambda.Powertools.Logging;

namespace PowertoolsWorkshop.Module2.Services;

public interface IImageDetectionService
{
    Task<bool> HasPersonLabel(string fileId, string userId, string objectKey);
    
    Task ReportImageIssue(string fileId, string userId);
}

public class ImageDetectionService : IImageDetectionService
{
    private static string _filesBucketName;
    private static string _apiUrlHost;
    private static string _apiKeySecretName;
    private static IAmazonRekognition _rekognitionClient;
    private static IAmazonSecretsManager _secretsClient;
    private static IApiService _apiService;

    public ImageDetectionService()
    {
        _filesBucketName = Environment.GetEnvironmentVariable("BUCKET_NAME_FILES");
        _apiUrlHost = Environment.GetEnvironmentVariable("API_URL_HOST");
        _apiKeySecretName = Environment.GetEnvironmentVariable("API_KEY_SECRET_NAME");

        _apiService = new ApiService();
        _rekognitionClient = new AmazonRekognitionClient();
        _secretsClient = new AmazonSecretsManagerClient();
    }
    
    public async Task<bool> HasPersonLabel(string fileId, string userId, string objectKey)
    {
        Logger.LogInformation($"Get labels for File Id: {fileId}");
       
        var response = await _rekognitionClient.DetectLabelsAsync(new DetectLabelsRequest
        {
            Image = new Image
            {
                S3Object = new S3Object
                {
                    Bucket = _filesBucketName,
                    Name = objectKey
                },
            }
        }).ConfigureAwait(false);

        if (response?.Labels is null || !response.Labels.Any())
        {
            Logger.LogWarning("No labels found in image");
            return false;
        }

        if (!response.Labels.Any(l =>
                string.Equals(l.Name, "Person", StringComparison.InvariantCultureIgnoreCase) &&
                l.Confidence > 75))
        {
            Logger.LogWarning("No person found in image");
            return false;
        }

        Logger.LogInformation("Person found in image");
        return true;
    }
    
    public async Task ReportImageIssue(string fileId, string userId)
    {
        var apiUrlParameter = JsonSerializer.Deserialize<ApiUrlParameter>(_apiUrlHost);
        var apiKey = await GetSecret(_apiKeySecretName).ConfigureAwait(false);

        if (string.IsNullOrWhiteSpace(apiUrlParameter?.Url) || string.IsNullOrWhiteSpace(apiKey))
            throw new Exception($"Missing apiUrl or apiKey. apiUrl: ${apiUrlParameter?.Url}, apiKey: ${apiKey}");

        Logger.LogInformation("Sending report to the API");

        await _apiService.PostAsJsonAsync(apiUrlParameter.Url, apiKey, new { fileId, userId }).ConfigureAwait(false);

        Logger.LogInformation("Report sent to the API");
    }
    
    private async Task<string> GetSecret(string secretId)
    {
        var response = await _secretsClient.GetSecretValueAsync(
            new GetSecretValueRequest
            {
                SecretId = secretId,
                VersionStage = "AWSCURRENT"
            }).ConfigureAwait(false);

        if (response.SecretString is not null)
            return response.SecretString;

        var memoryStream = response.SecretBinary;
        var reader = new StreamReader(memoryStream);
        var base64String = await reader.ReadToEndAsync();
        var decodedBinarySecret = Encoding.UTF8.GetString(Convert.FromBase64String(base64String));
        return decodedBinarySecret;
    }
}