// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

using System;
using System.Threading.Tasks;
using Amazon.Lambda.Core;
using Amazon.Lambda.DynamoDBEvents;
using AWS.Lambda.Powertools.Logging;
using AWS.Lambda.Powertools.Tracing;
using AWS.Lambda.Powertools.BatchProcessing;
using AWS.Lambda.Powertools.BatchProcessing.DynamoDb;
using AWS.Lambda.Powertools.Parameters;
using PowertoolsWorkshop.Module2.Services;

namespace PowertoolsWorkshop
{
    public class ImageDetectionFunction
    {
        private static IImageDetectionService _imageDetectionService;
        private static IDynamoDbStreamBatchProcessor _batchProcessor;

        /// <summary>
        /// Default constructor. This constructor is used by Lambda to construct the instance. When invoked in a Lambda environment
        /// the AWS credentials will come from the IAM role associated with the function and the AWS region will be set to the
        /// region the Lambda function is executed in.
        /// </summary>
        public ImageDetectionFunction()
        {
            Tracing.RegisterForAllServices();
            ParametersManager.DefaultMaxAge(TimeSpan.FromSeconds(900));

            _imageDetectionService = new ImageDetectionService();
            _batchProcessor = DynamoDbStreamBatchProcessor.Instance;
        }

        /// <summary>
        /// This method is called for every Lambda invocation. This method takes in a DynamoDB event object 
        /// and can be used to respond to DynamoDB stream notifications.
        /// </summary>
        /// <param name="dynamoEvent"></param>
        /// <param name="context"></param>
        /// <returns></returns>
        [Tracing(CaptureMode = TracingCaptureMode.ResponseAndError)]
        [Logging(LogEvent = true, LoggerOutputCase = LoggerOutputCase.PascalCase)]
        public async Task<BatchItemFailuresResponse> FunctionHandler(DynamoDBEvent dynamoEvent, ILambdaContext context)
        {
            var result = await _batchProcessor.ProcessAsync(dynamoEvent,
                RecordHandler<DynamoDBEvent.DynamodbStreamRecord>.From(
                    record =>
                    {
                        RecordHandler(record, context)
                            .GetAwaiter()
                            .GetResult();
                    }));
            return result.BatchItemFailuresResponse;
        }

        [Tracing(SegmentName = "### RecordHandler")]
        private async Task RecordHandler(DynamoDBEvent.DynamodbStreamRecord record, ILambdaContext context)
        {
            var fileId = record.Dynamodb.NewImage["id"].S;
            var userId = record.Dynamodb.NewImage["userId"].S;
            var transformedFileKey = record.Dynamodb.NewImage["transformedFileKey"].S;

            Logger.AppendKey("FileId", fileId);
            Logger.AppendKey("UserId", userId);

            Tracing.AddAnnotation("FileId", fileId);
            Tracing.AddAnnotation("UserId", userId);

            if (context.RemainingTime.TotalMilliseconds < 1000)
            {
                Logger.LogWarning("Invocation is about to time out, marking all remaining records as failed");
                throw new Exception("Time remaining <1s, marking record as failed to retry later");
            }

            if (!await _imageDetectionService.HasPersonLabel(fileId, userId, transformedFileKey).ConfigureAwait(false))
                await _imageDetectionService.ReportImageIssue(fileId, userId).ConfigureAwait(false);

            Logger.RemoveKeys();
        }
    }
}
