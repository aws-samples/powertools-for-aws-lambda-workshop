import { injectLambdaContext } from "@aws-lambda-powertools/logger";
import { logMetrics, MetricUnits } from "@aws-lambda-powertools/metrics";
import { captureLambdaHandler } from "@aws-lambda-powertools/tracer";
import middy from "@middy/core";
import type { Context, SQSEvent, SQSRecord } from "aws-lambda";
import type { Subsegment } from "aws-xray-sdk-core";
import ffmpeg from "fluent-ffmpeg";

import { logger, metrics, tracer } from "./common/powertools";
import { getPresignedDownloadUrl } from "./common/presigned-url-utils";
import type { TransformParams } from "./common/processing-utils";
import {
  getFileId,
  getObjectKey,
  getVideoTransformParams,
  ItemsListKeeper,
  timedOutAsyncOperation,
  TimeoutErr,
} from "./common/processing-utils";
import { saveAssetToS3 } from "./common/s3-utils";

const dynamoDBTableFiles = process.env.TABLE_NAME_FILES || "";
const s3BucketFiles = process.env.BUCKET_NAME_FILES || "";
let itemsProcessorHelper: ItemsListKeeper;

const processVideo = async (
  presignedUrlOriginalVideo: string,
  { width, height }: TransformParams,
  fileId: string,
  tmpFilePath: string,
  mainSubSegment: Subsegment
): Promise<void> => {
  await tracer.provider.captureAsyncFunc(
    "### process video",
    async (subsegment?: Subsegment) => {
      subsegment?.addAnnotation("fileId", fileId);
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
        subsegment?.addErrorFlag();
        subsegment?.addError(err, false);
        logger.error(`Error processing video`, {
          details: fileId,
          error: err,
        });
        throw err;
      } finally {
        subsegment?.close();
        subsegment?.flush();
      }
    },
    mainSubSegment
  );
};

const processOne = async (
  fileId: string,
  objectKey: string,
  mainSubSegment: Subsegment
) => {
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

  await processVideo(
    presignedUrlOriginalVideo,
    transformParams,
    fileId,
    tmpFilePath,
    mainSubSegment
  );

  await saveAssetToS3({
    key: newFileKey,
    bucketName: s3BucketFiles,
    pathToFile: `/tmp/${fileId}.webm`,
  });
  logger.info("Saved video on S3", { details: newFileKey });

  metrics.addMetric("processedVideos", MetricUnits.Count, 1);
};

export const handler = middy(async (event: SQSEvent, context: Context) => {
  itemsProcessorHelper = new ItemsListKeeper();
  const mainSubsegment = tracer.getSegment() as Subsegment;

  const messageProcesses = Promise.all(
    event.Records.map(async (record: SQSRecord) => {
      const { body, messageId } = record;
      const objectKey = getObjectKey(body);
      const fileId = getFileId(objectKey);

      try {
        await itemsProcessorHelper.markStarted({
          id: fileId,
          msgId: messageId,
        });
        await processOne(fileId, objectKey, mainSubsegment);
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
      logger.error("An un expected error occurred", err);
    }
    logger.error("Function will timeout in", {
      details: context.getRemainingTimeInMillis(),
    });
  } finally {
    const batchItemFailures: { itemIdentifier: string }[] = [];

    // Get all items that were failed & add them to the `batchItemFailures`
    const failed = itemsProcessorHelper.getFailed();
    for (const [_, msgId] of failed) {
      batchItemFailures.push({ itemIdentifier: msgId });
    }

    // Get items still left to process
    const unprocessed = itemsProcessorHelper.getUnprocessed();

    // Mark each one as failed & add it to `batchItemFailures` so they are sent back to the queue/DLQ
    for await (const [id, msgId] of unprocessed) {
      await itemsProcessorHelper.markFailed(id);
      batchItemFailures.push({ itemIdentifier: msgId });
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
})
  .use(captureLambdaHandler(tracer))
  .use(injectLambdaContext(logger, { logEvent: true }))
  .use(logMetrics(metrics));
