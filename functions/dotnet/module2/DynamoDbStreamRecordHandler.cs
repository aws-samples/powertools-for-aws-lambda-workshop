// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

using System.Threading;
using System.Threading.Tasks;
using Amazon.Lambda.DynamoDBEvents;
using AWS.Lambda.Powertools.BatchProcessing;
using AWS.Lambda.Powertools.BatchProcessing.DynamoDb;

namespace PowertoolsWorkshop;

public class DynamoDbStreamRecordHandler : IDynamoDbStreamRecordHandler
{
    private static IImageDetectionProcessor _imageDetectionProcessor;

    public DynamoDbStreamRecordHandler()
    {
        _imageDetectionProcessor = new ImageDetectionProcessor();
    }

    public async Task<RecordHandlerResult> HandleAsync(DynamoDBEvent.DynamodbStreamRecord record, CancellationToken cancellationToken)
    {
        await _imageDetectionProcessor.ProcessRecord(record);
        return await Task.FromResult(RecordHandlerResult.None);
    }
}