import { DetectLabelsCommand } from '@aws-sdk/client-rekognition';
import { rekognitionClient } from '@commons/clients/rekognition';
import { tracer } from '@commons/powertools';
import { logger } from '@commons/powertools';
import { NoLabelsFoundError, NoPersonFoundError } from './errors.js';

const isError = (error: unknown): error is Error => {
  return error instanceof Error;
};

/**
 * Utility function that calls the Rekognition API to get the labels of an image.
 *
 * If the labels **DO NOT** include `Person` or the confidence is **BELOW** 75, it throws an error.
 */
const getLabels = async (
  bucketName: string,
  fileId: string,
  userId: string,
  transformedFileKey: string
): Promise<void> => {
  const subsegment = tracer.getSegment()?.addNewSubsegment('#### getLabels');
  subsegment && tracer.setSegment(subsegment);

  try {
    const response = await rekognitionClient.send(
      new DetectLabelsCommand({
        Image: {
          S3Object: {
            Bucket: bucketName,
            Name: transformedFileKey,
          },
        },
      })
    );

    const { Labels: labels } = response;

    if (!labels || labels.length === 0)
      throw new NoLabelsFoundError({ fileId, userId });

    const personLabel = labels.find(
      (label) =>
        ['Person'].includes(label.Name || '') &&
        label.Confidence &&
        label.Confidence > 75
    );
    if (!personLabel) throw new NoLabelsFoundError({ fileId, userId });
  } catch (error) {
    let errorMessage = 'Unable to get labels';
    if (
      error instanceof NoLabelsFoundError ||
      error instanceof NoPersonFoundError
    ) {
      errorMessage = error.message;
    }
    if (isError(error)) {
      logger.error(errorMessage, error);
      subsegment?.addError(error);
    }

    throw error;
  } finally {
    subsegment?.close();
    subsegment && tracer.setSegment(subsegment.parent);
  }
};

/**
 * Utility function that calls the API to report an image issue.
 */
const reportImageIssue = async (
  fileId: string,
  userId: string,
  options: {
    apiUrl?: string;
    apiKey?: string;
  } = {}
): Promise<void> => {
  const { apiUrl, apiKey } = options;
  if (!apiUrl || !apiKey) {
    throw new Error(
      `Missing apiUrl or apiKey. apiUrl: ${apiUrl}, apiKey: ${apiKey}`
    );
  }

  logger.debug('Sending report to the API');

  // Send the labels to the API
  await fetch(apiUrl, {
    method: 'POST',
    headers: new Headers({
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    }),
    body: JSON.stringify({
      fileId,
      userId,
    }),
  });

  logger.debug('report sent to the API');
};

export { getLabels, reportImageIssue };
