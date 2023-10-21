// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

using System.Text.Json.Serialization;

namespace PowertoolsWorkshop.Module2.Services;

public class ApiUrlParameter
{
    [JsonPropertyName("url")] public string Url { get; set; }
}