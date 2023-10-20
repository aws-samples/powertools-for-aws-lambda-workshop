// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

using System;
using System.Linq;
using System.Threading.Tasks;
using Amazon.Rekognition;
using Amazon.Rekognition.Model;
using AWS.Lambda.Powertools.Logging;
using AWS.Lambda.Powertools.Parameters;
using AWS.Lambda.Powertools.Parameters.SecretsManager;
using AWS.Lambda.Powertools.Parameters.SimpleSystemsManagement;
using AWS.Lambda.Powertools.Tracing;

namespace PowertoolsWorkshop.Module2.Services;

public interface IImageDetectionService
{
    Task<bool> HasPersonLabel(string fileId, string userId, string objectKey);
    
    Task ReportImageIssue(string fileId, string userId);
}

public class ImageDetectionService : IImageDetectionService
{
    private static string _filesBucketName;
    private static string _apiUrlParameterName;
    private static string _apiKeySecretName;
    private static IAmazonRekognition _rekognitionClient;
    private static ISsmProvider _ssmProvider;
    private static ISecretsProvider _secretsProvider;
    private static IApiService _apiService;

    public ImageDetectionService()
    {
        _filesBucketName = Environment.GetEnvironmentVariable("BUCKET_NAME_FILES");
        _apiUrlParameterName = Environment.GetEnvironmentVariable("API_URL_PARAMETER_NAME");
        _apiKeySecretName = Environment.GetEnvironmentVariable("API_KEY_SECRET_NAME");

        _apiService = new ApiService();
        _rekognitionClient = new AmazonRekognitionClient();

        _ssmProvider = ParametersManager.SsmProvider;
        _secretsProvider = ParametersManager.SecretsProvider;
    }

    [Tracing]
    public async Task<bool> HasPersonLabel(string fileId, string userId, string objectKey)
    {
        Logger.LogInformation($"Get labels for File Id: {fileId}");
        Tracing.AddAnnotation("FileId", fileId);

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
            Logger.LogWarning(new { FileId = fileId, UserId = userId }, "No labels found in image");
            return false;
        }

        if (!response.Labels.Any(l =>
                string.Equals(l.Name, "Person", StringComparison.InvariantCultureIgnoreCase) &&
                l.Confidence > 75))
        {
            Logger.LogWarning(new { FileId = fileId, UserId = userId }, "No person found in image");
            return false;
        }

        Logger.LogInformation(new { FileId = fileId, UserId = userId }, "Person found in image");
        return true;
    }

    [Tracing]
    public async Task ReportImageIssue(string fileId, string userId)
    {
        var apiUrl = await _ssmProvider.GetAsync(_apiUrlParameterName).ConfigureAwait(false);
        var apiKey = await _secretsProvider.GetAsync(_apiKeySecretName).ConfigureAwait(false);

        if (string.IsNullOrWhiteSpace(apiUrl) || string.IsNullOrWhiteSpace(apiKey))
            throw new Exception($"Missing apiUrl or apiKey. apiUrl: ${apiUrl}, apiKey: ${apiKey}");

        Logger.LogInformation("Sending report to the API");

        await _apiService.PostAsJsonAsync(apiUrl, apiKey, new { fileId, userId }).ConfigureAwait(false);

        Logger.LogInformation("Report sent to the API");
    }
}