// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

using System.Drawing;

namespace PowertoolsWorkshop.Module1.Services;

public static class Constants
{
    public const string TransformedImagePrefix = "transformed/image/jpg";
    public const string TransformedImageExtension = ".jpeg";
}

public static class TransformSize
{
    public static readonly Size Small = new Size(720, 480);
    public static readonly Size Medium = new Size(1280, 720);
    public static readonly Size Large = new Size(1920, 1080);
}

public static class FileStatus
{
    public const string Queued= "queued";
    public const string Working= "in-progress";
    public const string Completed = "completed";
    public const string Failed = "failed";
}

public static class Mutations
{ 
    public const string GeneratePresignedUploadUrl = @"
        mutation GeneratePresignedUploadUrl($input: PresignedUploadUrlInput)  {
            generatePresignedUploadUrl(input: $input) {
                id
                url
            }
        }
    ";
    
    public const string UpdateFileStatus = @"
        mutation UpdateFileStatus($input: FileStatusUpdateInput) {
            updateFileStatus(input: $input) {
                id
                status
                transformedFileKey
            }
        }
    ";
}