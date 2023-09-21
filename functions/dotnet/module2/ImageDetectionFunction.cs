// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

using System;
using Amazon.Lambda.Core;
using Amazon.Lambda.DynamoDBEvents;
using AWS.Lambda.Powertools.Logging;
using AWS.Lambda.Powertools.Metrics;
using AWS.Lambda.Powertools.Tracing;
using AWS.Lambda.Powertools.BatchProcessing;
using AWS.Lambda.Powertools.BatchProcessing.DynamoDb;
using AWS.Lambda.Powertools.Parameters;

namespace PowertoolsWorkshop
{
    public class ImageDetectionFunction
    {
        /// <summary>
        /// Default constructor. This constructor is used by Lambda to construct the instance. When invoked in a Lambda environment
        /// the AWS credentials will come from the IAM role associated with the function and the AWS region will be set to the
        /// region the Lambda function is executed in.
        /// </summary>
        public ImageDetectionFunction()
        {
            Tracing.RegisterForAllServices();
            ParametersManager.DefaultMaxAge(TimeSpan.FromSeconds(900));
        }

        /// <summary>
        /// This method is called for every Lambda invocation. This method takes in an S3 event object and can be used 
        /// to respond to S3 notifications.
        /// </summary>
        /// <param name="dynamoEvent"></param>
        /// <param name="context"></param>
        /// <returns></returns>
        [Metrics(CaptureColdStart = true)]
        [Tracing(CaptureMode = TracingCaptureMode.ResponseAndError)]
        [Logging(LogEvent = true, LoggerOutputCase = LoggerOutputCase.PascalCase)]
        [BatchProcessor(RecordHandler = typeof(DynamoDbStreamRecordHandler))]
        public BatchItemFailuresResponse FunctionHandler(DynamoDBEvent dynamoEvent, ILambdaContext context)
        {
            return DynamoDbStreamBatchProcessor.Result.BatchItemFailuresResponse;
        }
    }
}
