// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

using System;
using System.Net.Http;
using System.Net.Mime;
using System.Text;
using System.Threading.Tasks;
using Amazon.Util;
using Newtonsoft.Json;

namespace PowertoolsWorkshop.Module2.Services;

public interface IApiService
{
    Task PostAsJsonAsync(string apiUrl, string apiKey, object content);
}

public class ApiService : IApiService
{
    public async Task PostAsJsonAsync(string apiUrl, string apiKey, object content)
    {
        if (string.IsNullOrWhiteSpace(apiUrl))
            throw new ArgumentNullException(nameof(apiUrl));

        if (string.IsNullOrWhiteSpace(apiKey))
            throw new ArgumentNullException(nameof(apiKey));

        if (content is null)
            throw new ArgumentNullException(nameof(content));

        var httpClient = new HttpClient();

        var jsonPayload = JsonConvert.SerializeObject(content);
        var requestContent = new StringContent(jsonPayload, Encoding.ASCII, MediaTypeNames.Application.Json);
        var httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, apiUrl)
        {
            Content = requestContent
        };

        httpRequestMessage.Headers.TryAddWithoutValidation("x-api-key", apiKey);
        httpRequestMessage.Headers.TryAddWithoutValidation(HeaderKeys.ContentTypeHeader, MediaTypeNames.Application.Json);

        var httpResponseMessage = await httpClient.SendAsync(httpRequestMessage);
        httpResponseMessage.EnsureSuccessStatusCode();
    }
}