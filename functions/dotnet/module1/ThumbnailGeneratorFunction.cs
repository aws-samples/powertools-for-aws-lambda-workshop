// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Amazon.DynamoDBv2;
using Amazon.DynamoDBv2.Model;
using Amazon.Lambda.CloudWatchEvents.S3Events;
using Amazon.Lambda.Core;
using Amazon.S3;
using Amazon.S3.Model;
using AWS.Lambda.Powertools.Idempotency;
using AWS.Lambda.Powertools.Logging;
using AWS.Lambda.Powertools.Metrics;
using AWS.Lambda.Powertools.Tracing;

// Assembly attribute to enable the Lambda function's JSON input to be converted into a .NET class.
[assembly: LambdaSerializer(typeof(Amazon.Lambda.Serialization.SystemTextJson.DefaultLambdaJsonSerializer))]

namespace PowertoolsWorkshop
{
    public class ThumbnailGeneratorFunction
    {
        private static IAmazonS3 _s3Client;
        private static IImageResizer _imageResizer;
        private static IAmazonDynamoDB _dynamoDb;
        private static IAppSyncOperations _appSyncOperations;
        private static string _filesTableName;

        /// <summary>
        /// Default constructor. This constructor is used by Lambda to construct the instance. When invoked in a Lambda environment
        /// the AWS credentials will come from the IAM role associated with the function and the AWS region will be set to the
        /// region the Lambda function is executed in.
        /// </summary>
        public ThumbnailGeneratorFunction()
        {
            Tracing.RegisterForAllServices();

            _filesTableName = Environment.GetEnvironmentVariable("TABLE_NAME_FILES");
            var idempotencyTableName = Environment.GetEnvironmentVariable("IDEMPOTENCY_TABLE_NAME");
            var appSyncEndpoint = Environment.GetEnvironmentVariable("APPSYNC_ENDPOINT");
            
            Idempotency.Configure(builder => builder.UseDynamoDb(idempotencyTableName));

            _s3Client = new AmazonS3Client();
            _imageResizer = new ImageResizer();
            _dynamoDb = new AmazonDynamoDBClient();
            _appSyncOperations = new AppSyncOperations(appSyncEndpoint);
        }

        /// <summary>
        /// This method is called for every Lambda invocation. This method takes in an S3 event object and can be used 
        /// to respond to S3 notifications.
        /// </summary>
        /// <param name="evnt"></param>
        /// <param name="context"></param>
        /// <returns></returns>
        [Metrics(CaptureColdStart = true)]
        [Tracing(CaptureMode = TracingCaptureMode.ResponseAndError)]
        [Logging(LogEvent = true, LoggerOutputCase = LoggerOutputCase.PascalCase)]
        public async Task FunctionHandler(S3ObjectCreateEvent evnt, ILambdaContext context)
        {
            Idempotency.RegisterLambdaContext(context);

            var etag = evnt.Detail.Object.ETag;
            var objectKey = evnt.Detail.Object.Key;
            var filesBucket = evnt.Detail.Bucket.Name;
            var fileId = GetFileId(objectKey);

            // Mark file as working, this will notify subscribers that the file is being processed.
            await MarkFileAs(fileId, FileStatus.Working).ConfigureAwait(false);

            try
            {
                // Generate a thumbnail from uploaded images, and store it on S3
                var newObjectKey = await GenerateThumbnail(objectKey, filesBucket, etag).ConfigureAwait(false);

                Logger.LogInformation($"Transformed key {newObjectKey} is created for object key {objectKey}");

                // Mark file as completed, this will notify subscribers that the file is processed.
                await MarkFileAs(fileId, FileStatus.Completed, newObjectKey).ConfigureAwait(false);
            }
            catch (Exception e)
            {
                Logger.LogError(e);

                // Mark file as failed, this will notify subscribers that the file processing is failed.
                await MarkFileAs(fileId, FileStatus.Failed).ConfigureAwait(false);
            }
        }

        private static string GetFileId(string objectKey)
        {
            if (string.IsNullOrWhiteSpace(objectKey))
                return string.Empty;

            return objectKey
                .Split('/')
                .Last()
                .Split('.')
                .First();
        }

        [Tracing]
        [Idempotent]
        private async Task<string> GenerateThumbnail(string objectKey, string fileBucket, [IdempotencyKey] string etag)
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
            var thumbnailStream = await _imageResizer
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

            return newObjectKey;
        }

        [Tracing]
        private async Task MarkFileAs(string fileId, string status, string newObjectKey = null)
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

            await _appSyncOperations.RunGraphql
                (
                    Mutations.UpdateFileStatus,
                    "UpdateFileStatus",
                    variables)
                .ConfigureAwait(false);

            Logger.LogInformation($"File status change to {status} notification sent successfully.");
        }
    }
}
