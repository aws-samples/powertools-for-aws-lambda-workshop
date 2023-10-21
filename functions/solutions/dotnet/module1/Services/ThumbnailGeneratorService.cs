// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Amazon.DynamoDBv2;
using Amazon.DynamoDBv2.Model;
using Amazon.S3;
using Amazon.S3.Model;

namespace PowertoolsWorkshop.Module1.Services
{
    public interface IThumbnailGeneratorService
    {
        Task<string> GenerateThumbnailAsync(string objectKey, string fileBucket, string etag);

        Task MarkFileAsAsync(string fileId, string status, string newObjectKey);
    }
    
    public class ThumbnailGeneratorService : IThumbnailGeneratorService
    {
        private static string _filesTableName;
        private static IAmazonS3 _s3Client;
        private static IImageManipulationService _imageManipulationService;
        private static IAmazonDynamoDB _dynamoDb;

        /// <summary>
        /// Default constructor. This constructor is used by Lambda to construct the instance. When invoked in a Lambda environment
        /// the AWS credentials will come from the IAM role associated with the function and the AWS region will be set to the
        /// region the Lambda function is executed in.
        /// </summary>
        public ThumbnailGeneratorService()
        {
            _filesTableName = Environment.GetEnvironmentVariable("TABLE_NAME_FILES");
            _s3Client = new AmazonS3Client();
            _imageManipulationService = new ImageManipulationService();
            _dynamoDb = new AmazonDynamoDBClient();
        }
        
        public async Task<string> GenerateThumbnailAsync(string objectKey, string fileBucket, string etag)
        {
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

            return newObjectKey;
        }
        
        public async Task MarkFileAsAsync(string fileId, string status, string newObjectKey)
        {
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
        }
    }
}
