import { rekognitionClient } from '@commons/clients/rekognition';
import { DetectLabelsCommand } from '@aws-sdk/client-rekognition';
import type { Label } from '@aws-sdk/client-rekognition';
import { tracer } from '@commons/powertools';
import { logger } from './index';
import { transformedImagePrefix, transformedImageExtension } from '@constants';
import { NoLabelsFoundError } from './errors';

const isError = (error: unknown): error is Error => {
  return error instanceof Error;
};

const getLabels = async (
  bucketName: string,
  fileId: string,
  userId: string
): Promise<Array<Label>> => {
  const mainSegment = tracer.getSegment();
  const subsegment = mainSegment?.addNewSubsegment('getLabels');
  subsegment?.addAnnotation('fileId', fileId);

  try {
    const response = await rekognitionClient.send(
      new DetectLabelsCommand({
        Image: {
          S3Object: {
            Bucket: bucketName,
            Name: `${transformedImagePrefix}/${fileId}${transformedImageExtension}`,
          },
        },
      })
    );

    const { Labels: labels } = response;

    if (!labels || labels.length === 0)
      throw new NoLabelsFoundError({ fileId, userId });

    const allowListedLabels = labels.filter(
      (label) =>
        ['Person', 'Cat', 'Dog'].includes(label.Name || '') &&
        label.Confidence &&
        label.Confidence > 75
    );
    if (allowListedLabels.length === 0)
      throw new NoLabelsFoundError({ fileId, userId });

    logger.info('Detected labels', { details: allowListedLabels });

    return allowListedLabels;
  } catch (error) {
    let errorMessage = 'Unable to get labels';
    if (error instanceof NoLabelsFoundError) {
      errorMessage = error.message;
    }
    if (isError(error)) {
      logger.error(errorMessage, error);
      subsegment?.addError(error);
    }

    throw error;
  } finally {
    if (mainSegment && subsegment) {
      subsegment?.close();
      tracer.setSegment(mainSegment);
    }
  }
};

export { getLabels };
