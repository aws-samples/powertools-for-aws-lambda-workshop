// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

using System.Collections.Generic;
using System.Net.Mime;
using System.Text.Json;
using Amazon.Lambda.APIGatewayEvents;
using Amazon.Lambda.Core;
using Amazon.Util;
using AWS.Lambda.Powertools.Logging;
using AWS.Lambda.Powertools.Metrics;
using AWS.Lambda.Powertools.Tracing;
using Microsoft.AspNetCore.Http;

namespace PowertoolsWorkshop
{
    public class ApiEndpointHandlerFunction
    {
        public ApiEndpointHandlerFunction()
        {
            Tracing.RegisterForAllServices();
        }
        
        [Metrics(CaptureColdStart = true)]
        [Tracing(CaptureMode = TracingCaptureMode.ResponseAndError)]
        [Logging(LogEvent = true, LoggerOutputCase = LoggerOutputCase.PascalCase)]
        public APIGatewayProxyResponse FunctionHandler(APIGatewayProxyRequest apigProxyEvent, ILambdaContext context)
        {
            var body = new Dictionary<string, string>
            {
                { "message", "Hello from Lambda!" }
            };

            return new APIGatewayProxyResponse
            {
                Body = JsonSerializer.Serialize(body),
                StatusCode = StatusCodes.Status200OK,
                Headers = new Dictionary<string, string>
                {
                    { HeaderKeys.ContentTypeHeader, MediaTypeNames.Application.Json }
                }
            };
        }
    }
}
