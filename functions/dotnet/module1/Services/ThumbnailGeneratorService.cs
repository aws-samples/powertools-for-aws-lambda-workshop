// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Amazon.DynamoDBv2;
using Amazon.DynamoDBv2.Model;
using Amazon.S3;
using Amazon.S3.Model;
using AWS.Lambda.Powertools.Idempotency;
using AWS.Lambda.Powertools.Logging;
using AWS.Lambda.Powertools.Tracing;
using AWS.Lambda.Powertools.Metrics;
using Metrics = AWS.Lambda.Powertools.Metrics.Metrics;

namespace PowertoolsWorkshop.Module1.Services
{
    public interface IThumbnailGeneratorService
    {
        Task<string> GenerateThumbnailAsync(string objectKey, string fileBucket, string etag);

        Task MarkFileAsAsync(string fileId, string status, string newObjectKey = null);
    }
    
    public class ThumbnailGeneratorService : IThumbnailGeneratorService
    {
        private static string _filesTableName;
        private static IAmazonS3 _s3Client;
        private static IImageManipulationService _imageManipulationService;
        private static IAmazonDynamoDB _dynamoDb;
        private static IAppSyncService _appSyncService;

        /// <summary>
        /// Default constructor. This constructor is used by Lambda to construct the instance. When invoked in a Lambda environment
        /// the AWS credentials will come from the IAM role associated with the function and the AWS region will be set to the
        /// region the Lambda function is executed in.
        /// </summary>
        public ThumbnailGeneratorService()
        {
            _filesTableName = Environment.GetEnvironmentVariable("TABLE_NAME_FILES");
            var appSyncEndpoint = Environment.GetEnvironmentVariable("APPSYNC_ENDPOINT");

            _s3Client = new AmazonS3Client();
            _imageManipulationService = new ImageManipulationService();
            _dynamoDb = new AmazonDynamoDBClient();
            _appSyncService = new AppSyncService(appSyncEndpoint);
        }
        
        [Tracing]
        [Idempotent]
        public async Task<string> GenerateThumbnailAsync(string objectKey, string fileBucket, [IdempotencyKey] string etag)
        {
            Logger.LogInformation($"Generate Thumbnail for Object Key: {objectKey} and Etag: {etag}");

            // Get the original image from S3
            var getOriginalImageResponse = await _s3Client
                .GetObjectAsync(
                    new GetObjectRequest
                    {
                        BucketName = fileBucket,
                        Key = objectKey
                    })
                .ConfigureAwait(false);

            // Create thumbnail from original image
            var thumbnailStream = await _imageManipulationService
                .ResizeAsync(getOriginalImageResponse.ResponseStream, TransformSize.Small)
                .ConfigureAwait(false);

            // Save the thumbnail on S3
            var newObjectKey =
                $"{Constants.TransformedImagePrefix}/{Guid.NewGuid()}{Constants.TransformedImageExtension}";

            await _s3Client
                .PutObjectAsync(
                    new PutObjectRequest
                    {
                        BucketName = fileBucket,
                        Key = newObjectKey,
                        InputStream = thumbnailStream
                    })
                .ConfigureAwait(false);

            Logger.LogInformation($"Thumbnail is generated with new Object Key: {newObjectKey}");
            
            Metrics.AddMetric("ThumbnailGenerated", 1, MetricUnit.Count);

            return newObjectKey;
        }

        [Tracing]
        public async Task MarkFileAsAsync(string fileId, string status, string newObjectKey = null)
        {
            Logger.LogInformation($"Marking file as {status}...");

            var request = new UpdateItemRequest
            {
                TableName = _filesTableName,
                ReturnValues = "ALL_NEW",
                Key = new Dictionary<string, AttributeValue>
                {
                    { "id", new AttributeValue { S = fileId } }
                },
                UpdateExpression = "SET #S = :newstatus",
                ExpressionAttributeNames = new Dictionary<string, string>
                {
                    { "#S", "status" }
                },
                ExpressionAttributeValues = new Dictionary<string, AttributeValue>()
                {
                    { ":newstatus", new AttributeValue { S = status } }
                }
            };

            if (!string.IsNullOrWhiteSpace(newObjectKey))
            {
                request.UpdateExpression = "SET #S = :newstatus, #T = :newkey";
                request.ExpressionAttributeNames.Add("#T", "transformedFileKey");
                request.ExpressionAttributeValues.Add(":newkey", new AttributeValue { S = newObjectKey });
            }

            await _dynamoDb
                .UpdateItemAsync(request)
                .ConfigureAwait(false);

            Logger.LogInformation($"File marked as {status}. Sending file status change notification...");

            var variables = new Dictionary<string, object>
            {
                {
                    "input", new
                    {
                        id = fileId, status,
                        transformedFileKey = newObjectKey,
                    }
                },
            };

            await _appSyncService.RunGraphql
                (
                    Mutations.UpdateFileStatus,
                    "UpdateFileStatus",
                    variables)
                .ConfigureAwait(false);

            Logger.LogInformation($"File status change to {status} notification sent successfully.");
        }
    }
}
