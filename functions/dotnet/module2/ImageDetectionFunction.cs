// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

using System;
using System.Threading.Tasks;
using Amazon.Lambda.Core;
using Amazon.Lambda.DynamoDBEvents;
using AWS.Lambda.Powertools.Logging;
using AWS.Lambda.Powertools.Tracing;
using PowertoolsWorkshop.Module2.Services;

namespace PowertoolsWorkshop
{
    public class ImageDetectionFunction
    {
        private static IImageDetectionService _imageDetectionService;

        /// <summary>
        /// Default constructor. This constructor is used by Lambda to construct the instance. When invoked in a Lambda environment
        /// the AWS credentials will come from the IAM role associated with the function and the AWS region will be set to the
        /// region the Lambda function is executed in.
        /// </summary>
        public ImageDetectionFunction()
        {
            Tracing.RegisterForAllServices();
            _imageDetectionService = new ImageDetectionService();
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
        public async Task FunctionHandler(DynamoDBEvent dynamoEvent, ILambdaContext context)
        {
            foreach (var record in dynamoEvent.Records)
                await RecordHandler(record).ConfigureAwait(false);
        }
        
        private async Task RecordHandler(DynamoDBEvent.DynamodbStreamRecord record)
        {
            var fileId = record.Dynamodb.NewImage["id"].S;
            var userId = record.Dynamodb.NewImage["userId"].S;
            var transformedFileKey = record.Dynamodb.NewImage["transformedFileKey"].S;

            if (!await _imageDetectionService.HasPersonLabel(fileId, userId, transformedFileKey).ConfigureAwait(false))
                await _imageDetectionService.ReportImageIssue(fileId, userId).ConfigureAwait(false);
        }
    }
}
