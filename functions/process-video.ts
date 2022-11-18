// const failureLambda = require('failure-lambda');

import {MetricUnits} from "@aws-lambda-powertools/metrics";
import type {Context, SQSEvent, SQSRecord} from "aws-lambda";
import type {Subsegment} from "aws-xray-sdk-core";
import ffmpeg from "fluent-ffmpeg";

import {logger, metrics, tracer} from "./common/powertools";
import {getPresignedDownloadUrl} from "./common/presigned-url-utils";
import type {TransformParams} from "./common/processing-utils";
import {
    getFileId,
    getObjectKey,
    getVideoTransformParams,
    ItemsListKeeper,
    timedOutAsyncOperation,
    TimeoutErr,
} from "./common/processing-utils";
import { saveAssetToS3 } from "./common/s3-utils";
import { LambdaInterface } from "@aws-lambda-powertools/commons";

const dynamoDBTableFiles = process.env.TABLE_NAME_FILES || "";
const s3BucketFiles = process.env.BUCKET_NAME_FILES || "";
let itemsProcessorHelper: ItemsListKeeper;

class Lambda implements LambdaInterface {

    @tracer.captureMethod({ subSegmentName: "#### process video" })
    protected async processVideo(
        presignedUrlOriginalVideo: string,
        {width, height}: TransformParams,
        fileId: string,
        tmpFilePath: string,
    ): Promise<void> {
        try {
            return new Promise<void>((resolve, reject) => {
                ffmpeg(presignedUrlOriginalVideo)
                    .size(`${width}x${height}`)
                    .on("error", (err) => reject(err))
                    .on("end", () => {
                        resolve();
                    })
                    .save(tmpFilePath);
            });
        } catch (err) {
            logger.error(`Error processing video`, {
                details: fileId,
                error: err,
            });
            throw err;
        }
    }

    @tracer.captureMethod({ subSegmentName: "### process one", })
    protected async processOne(fileId: string, objectKey: string, mainSubSegment: Subsegment) {
        const newFileKey = `transformed/video/webm/${fileId}.webm`;
        const tmpFilePath = `/tmp/${fileId}.webm`;

        const presignedUrlOriginalVideo = await getPresignedDownloadUrl(
            objectKey,
            s3BucketFiles
        );

        const transformParams = await getVideoTransformParams({
            id: fileId,
            tableName: dynamoDBTableFiles,
        });

        await this.processVideo(
            presignedUrlOriginalVideo,
            transformParams,
            fileId,
            tmpFilePath,
        );

        await saveAssetToS3({
            key: newFileKey,
            bucketName: s3BucketFiles,
            pathToFile: `/tmp/${fileId}.webm`,
        });
        logger.info("Saved video on S3", {details: newFileKey});

        metrics.addMetric("processedVideos", MetricUnits.Count, 1);
    }

    @tracer.captureLambdaHandler()
    @metrics.logMetrics()
    @logger.injectLambdaContext()
    public async handler(event: SQSEvent, context: Context) {
        itemsProcessorHelper = new ItemsListKeeper();
        const mainSubsegment = tracer.getSegment() as Subsegment;

        const messageProcesses = Promise.all(
            event.Records.map(async (record: SQSRecord) => {
                const {body, messageId} = record;
                const objectKey = getObjectKey(body);
                const fileId = getFileId(objectKey);

                try {
                    await itemsProcessorHelper.markStarted({
                        id: fileId,
                        msgId: messageId,
                    });
                    await this.processOne(fileId, objectKey, mainSubsegment);
                    await itemsProcessorHelper.markProcessed(fileId);
                } catch (err) {
                    await itemsProcessorHelper.markFailed(fileId);
                }
            })
        );

        try {
            await timedOutAsyncOperation(
                messageProcesses,
                context.getRemainingTimeInMillis() - 5000
            );
        } catch (err) {
            if (err !== TimeoutErr) {
                logger.error("An un expected error occurred", err as Error);
            }
            logger.error("Function will timeout in", {
                details: context.getRemainingTimeInMillis(),
            });
        } finally {
            const batchItemFailures: { itemIdentifier: string }[] = [];

            // Get all items that were failed & add them to the `batchItemFailures`
            const failed = itemsProcessorHelper.getFailed();
            for (const [_, msgId] of failed) {
                batchItemFailures.push({itemIdentifier: msgId});
            }

            // Get items still left to process
            const unprocessed = itemsProcessorHelper.getUnprocessed();

            // Mark each one as failed & add it to `batchItemFailures` so they are sent back to the queue/DLQ
            for await (const [id, msgId] of unprocessed) {
                await itemsProcessorHelper.markFailed(id);
                batchItemFailures.push({itemIdentifier: msgId});
            }

            if (batchItemFailures.length) {
                logger.info("Items to be sent back to queue/DLQ", {
                    details: batchItemFailures,
                });
                return batchItemFailures;
            } else {
                logger.info("All items processed successfully");
            }
            return;


        }
    }
}

const handlerClass = new Lambda();
// TODO: reintroduce failureLambda()
export const handler = handlerClass.handler.bind(handlerClass);
