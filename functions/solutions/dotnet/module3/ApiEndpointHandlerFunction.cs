// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

using System.Collections.Generic;
using System.Net.Mime;
using System.Text.Json;
using Amazon.Lambda.APIGatewayEvents;
using Amazon.Lambda.Core;
using Amazon.Util;

namespace PowertoolsWorkshop
{
    public class ApiEndpointHandlerFunction
    {
        public APIGatewayProxyResponse FunctionHandler(APIGatewayProxyRequest apigProxyEvent, ILambdaContext context)
        {
            var body = new Dictionary<string, string>
            {
                { "message", "Hello from Lambda!" }
            };

            return new APIGatewayProxyResponse
            {
                Body = JsonSerializer.Serialize(body),
                StatusCode = 200,
                Headers = new Dictionary<string, string>
                {
                    { HeaderKeys.ContentTypeHeader, MediaTypeNames.Application.Json }
                }
            };
        }
    }
}
