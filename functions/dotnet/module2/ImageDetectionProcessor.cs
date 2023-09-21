// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

using System;
using System.Linq;
using System.Threading.Tasks;
using Amazon.Lambda.DynamoDBEvents;
using Amazon.Rekognition;
using Amazon.Rekognition.Model;
using AWS.Lambda.Powertools.Logging;
using AWS.Lambda.Powertools.Parameters;
using AWS.Lambda.Powertools.Parameters.SecretsManager;
using AWS.Lambda.Powertools.Parameters.SimpleSystemsManagement;
using AWS.Lambda.Powertools.Tracing;

namespace PowertoolsWorkshop;

public interface IImageDetectionProcessor
{
    Task ProcessRecord(DynamoDBEvent.DynamodbStreamRecord record);
}

public class ImageDetectionProcessor : IImageDetectionProcessor
{
    private static string _filesBucketName;
    private static string _apiUrlParameterName;
    private static string _apiKeySecretName;
    private static IAmazonRekognition _rekognitionClient;
    private static ISsmProvider _ssmProvider;
    private static ISecretsProvider _secretsProvider;
    private static IApiOperations _apiOperations;

    public ImageDetectionProcessor()
    {
        _filesBucketName = Environment.GetEnvironmentVariable("BUCKET_NAME_FILES");
        _apiUrlParameterName = Environment.GetEnvironmentVariable("API_URL_PARAMETER_NAME");
        _apiKeySecretName = Environment.GetEnvironmentVariable("API_KEY_SECRET_NAME");

        _rekognitionClient = new AmazonRekognitionClient();
        _apiOperations = new ApiOperations();

        _ssmProvider = ParametersManager.SsmProvider;
        _secretsProvider = ParametersManager.SecretsProvider;
    }

    [Tracing]
    public async Task ProcessRecord(DynamoDBEvent.DynamodbStreamRecord record)
    {
        var fileId = record.Dynamodb.NewImage["id"].S;
        var userId = record.Dynamodb.NewImage["userId"].S;
        var transformedFileKey = record.Dynamodb.NewImage["transformedFileKey"].S;

        if (!await HasPersonLabel(fileId, userId, transformedFileKey).ConfigureAwait(false))
            await ReportImageIssue(fileId, userId).ConfigureAwait(false);
    }

    [Tracing]
    private async Task<bool> HasPersonLabel(string fileId, string userId, string transformedFileKey)
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
                    Name = transformedFileKey
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
    private async Task ReportImageIssue(string fileId, string userId)
    {
        var apiUrl = await _ssmProvider.GetAsync(_apiUrlParameterName).ConfigureAwait(false);
        var apiKey = await _secretsProvider.GetAsync(_apiKeySecretName).ConfigureAwait(false);

        if (string.IsNullOrWhiteSpace(apiUrl) || string.IsNullOrWhiteSpace(apiKey))
            throw new Exception($"Missing apiUrl or apiKey. apiUrl: ${apiUrl}, apiKey: ${apiKey}");

        Logger.LogInformation("Sending report to the API");

        await _apiOperations.PosAsJsonAsync(apiUrl, apiKey, new { fileId, userId }).ConfigureAwait(false);

        Logger.LogInformation("Report sent to the API");
    }
}