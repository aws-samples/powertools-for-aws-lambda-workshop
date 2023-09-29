// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

using System.Threading;
using System.Threading.Tasks;
using Amazon.Lambda.DynamoDBEvents;
using AWS.Lambda.Powertools.BatchProcessing;
using AWS.Lambda.Powertools.BatchProcessing.DynamoDb;
using PowertoolsWorkshop.Module2.Services;

namespace PowertoolsWorkshop;

public class DynamoDbStreamRecordHandler : IDynamoDbStreamRecordHandler
{
    private static IImageDetectionService _imageDetectionService;

    public DynamoDbStreamRecordHandler()
    {
        _imageDetectionService = new ImageDetectionService();
    }

    public async Task<RecordHandlerResult> HandleAsync(DynamoDBEvent.DynamodbStreamRecord record, CancellationToken cancellationToken)
    {
        var fileId = record.Dynamodb.NewImage["id"].S;
        var userId = record.Dynamodb.NewImage["userId"].S;
        var transformedFileKey = record.Dynamodb.NewImage["transformedFileKey"].S;

        if (!await _imageDetectionService.HasPersonLabel(fileId, userId, transformedFileKey).ConfigureAwait(false))
            await _imageDetectionService.ReportImageIssue(fileId, userId).ConfigureAwait(false);
        return await Task.FromResult(RecordHandlerResult.None);
    }
}