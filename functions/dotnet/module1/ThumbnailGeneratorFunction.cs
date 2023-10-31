// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

using System;
using System.Linq;
using System.Threading.Tasks;
using Amazon.Lambda.CloudWatchEvents.S3Events;
using Amazon.Lambda.Core;
using PowertoolsWorkshop.Module1.Services;

// Assembly attribute to enable the Lambda function's JSON input to be converted into a .NET class.
[assembly: LambdaSerializer(typeof(Amazon.Lambda.Serialization.SystemTextJson.DefaultLambdaJsonSerializer))]

namespace PowertoolsWorkshop
{
    public class ThumbnailGeneratorFunction
    {
        private static IAppSyncService _appSyncService;
        private static IThumbnailGeneratorService _thumbnailGeneratorService;

        /// <summary>
        /// Default constructor. This constructor is used by Lambda to construct the instance. When invoked in a Lambda environment
        /// the AWS credentials will come from the IAM role associated with the function and the AWS region will be set to the
        /// region the Lambda function is executed in.
        /// </summary>
        public ThumbnailGeneratorFunction()
        {
            _appSyncService = new AppSyncService();
            _thumbnailGeneratorService = new ThumbnailGeneratorService();
        }

        /// <summary>
        /// This method is called for every Lambda invocation. This method takes in an S3 event object and can be used 
        /// to respond to S3 notifications.
        /// </summary>
        /// <param name="evnt"></param>
        /// <param name="context"></param>
        /// <returns></returns>
        public async Task FunctionHandler(S3ObjectCreateEvent evnt, ILambdaContext context)
        {
            var etag = evnt.Detail.Object.ETag;
            var objectKey = evnt.Detail.Object.Key;
            var filesBucket = evnt.Detail.Bucket.Name;
            var fileId = GetFileId(objectKey);

            // Mark file as working, this will notify subscribers that the file is being processed.
            await UpdateStatus(fileId, FileStatus.Working).ConfigureAwait(false);

            try
            {
                // Generate a thumbnail from uploaded images, and store it on S3
                var newObjectKey = await GenerateThumbnail(objectKey, filesBucket, etag).ConfigureAwait(false);

                Console.WriteLine($"Transformed key {newObjectKey} is created for object key {objectKey}");

                // Mark file as completed, this will notify subscribers that the file is processed.
                await UpdateStatus(fileId, FileStatus.Completed, newObjectKey).ConfigureAwait(false);
            }
            catch (Exception e)
            {
                Console.WriteLine(e.Message);

                // Mark file as failed, this will notify subscribers that the file processing is failed.
                await UpdateStatus(fileId, FileStatus.Failed).ConfigureAwait(false);
            }
        }
        
        private async Task<string> GenerateThumbnail(string objectKey, string filesBucket, string etag)
        {
            Console.WriteLine($"Generate Thumbnail for Object Key: {objectKey} and Etag: {etag}");
            
            var newObjectKey = await _thumbnailGeneratorService
                .GenerateThumbnailAsync(objectKey, filesBucket, etag)
                .ConfigureAwait(false);

            Console.WriteLine($"Saved image on S3: {newObjectKey}");
            
            return newObjectKey;
        }
        
        private async Task UpdateStatus(string fileId, string status, string newObjectKey = null)
        {
            Console.WriteLine($"Marking file as {status}...");

            await _thumbnailGeneratorService
                .MarkFileAsAsync(fileId, status, newObjectKey)
                .ConfigureAwait(false);

            Console.WriteLine($"Sending notification to subscribers...");

            await _appSyncService
                .NotifySubscribersAsync(fileId, status, newObjectKey)
                .ConfigureAwait(false);
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
    }
}
