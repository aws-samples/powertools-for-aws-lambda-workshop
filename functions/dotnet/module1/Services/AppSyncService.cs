// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Net.Mime;
using System.Text;
using System.Threading.Tasks;
using Amazon.AppSync;
using Amazon.Runtime;
using Amazon.Runtime.Internal;
using Amazon.Runtime.Internal.Auth;
using Amazon.Util;
using Newtonsoft.Json;

namespace PowertoolsWorkshop.Module1.Services;

public interface IAppSyncService
{
    Task NotifySubscribersAsync(string fileId, string status, string newObjectKey);
}

public class AppSyncService : IAppSyncService
{
    private readonly Uri _graphQlEndpoint;
    private readonly Amazon.RegionEndpoint _awsRegion;

    public AppSyncService(string graphQlEndpoint = null, string awsRegion = null)
    {
        if (string.IsNullOrWhiteSpace(graphQlEndpoint))
            graphQlEndpoint = Environment.GetEnvironmentVariable("APPSYNC_ENDPOINT");
        if (string.IsNullOrWhiteSpace(graphQlEndpoint))
            throw new ArgumentNullException(nameof(graphQlEndpoint), "GraphQLEndpoint is required");
        _graphQlEndpoint = new Uri(graphQlEndpoint);
        if (string.IsNullOrWhiteSpace(awsRegion))
            awsRegion = Environment.GetEnvironmentVariable("AWS_REGION");
        _awsRegion = Amazon.RegionEndpoint.GetBySystemName(awsRegion);
    }

    public async Task NotifySubscribersAsync(string fileId, string status, string newObjectKey)
    {
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

        await RunGraphqlAsync
            (
                Mutations.UpdateFileStatus,
                "UpdateFileStatus",
                variables)
            .ConfigureAwait(false);
    }

    private async Task RunGraphqlAsync(string query, string operationName, Dictionary<string, object> variables)
    {
        var immutableCredentials =
            await FallbackCredentialsFactory
                .GetCredentials()
                .GetCredentialsAsync()
                .ConfigureAwait(false);
        
        var jsonPayload = JsonConvert.SerializeObject(new { query, operationName, variables });
        var requestContent = new StringContent(jsonPayload, Encoding.ASCII, MediaTypeNames.Application.Json);
        var httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, _graphQlEndpoint)
        {
            Content = requestContent
        };

        httpRequestMessage.Headers.Add(HeaderKeys.XAmzSecurityTokenHeader, immutableCredentials.Token);
        httpRequestMessage.Headers.Add(HeaderKeys.HostHeader, _graphQlEndpoint.Host);

        // Construct AWS request object
        var rawBytes = Encoding.ASCII.GetBytes(await requestContent.ReadAsStringAsync());
        var awsRequest = new DefaultRequest(new AmazonAppSyncRequest(), "appsync")
        {
            Content = rawBytes,
            HttpMethod = HttpMethod.Post.Method,
            Endpoint = _graphQlEndpoint,
            AlternateEndpoint = _awsRegion
        };

        // Add all headers from httpRequestMessage to AWS request object
        foreach (var header in httpRequestMessage.Headers.Concat(httpRequestMessage.Content.Headers))
        {
            awsRequest.Headers[header.Key] = string.Join(", ", header.Value);
        }

        var signer = new AWS4Signer();
        signer.Sign(awsRequest, new AmazonAppSyncConfig(), null, immutableCredentials);

        var httpClient = new HttpClient();

        // add the signer's authorization+other headers to httpRequestMessage
        foreach (var header in awsRequest.Headers)
        {
            if(
                !string.Equals(header.Key, HeaderKeys.ContentTypeHeader, StringComparison.InvariantCultureIgnoreCase) &&
                !string.Equals(header.Key, HeaderKeys.ContentLengthHeader, StringComparison.InvariantCultureIgnoreCase) &&
                !string.Equals(header.Key, HeaderKeys.XAmzSecurityTokenHeader, StringComparison.InvariantCultureIgnoreCase) &&
                !string.Equals(header.Key, HeaderKeys.HostHeader, StringComparison.InvariantCultureIgnoreCase)
               )
            {
                httpRequestMessage.Headers.TryAddWithoutValidation(header.Key, header.Value);
            }
        }

        var httpResponseMessage = await httpClient.SendAsync(httpRequestMessage);
        httpResponseMessage.EnsureSuccessStatusCode();
    }
}