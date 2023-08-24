import type { ImageMetadata } from './types';

class ImageDetectionError extends Error {
  public fileId: string;
  public userId: string;

  public constructor(
    message: string,
    metadata: ImageMetadata,
    options?: ErrorOptions
  ) {
    super(message, options);
    this.name = 'ImageDetectionError';
    this.fileId = metadata.fileId;
    this.userId = metadata.userId;
  }
}

class NoLabelsFoundError extends ImageDetectionError {
  public constructor(metadata: ImageMetadata, options?: ErrorOptions) {
    super('No labels found in image', metadata, options);
    this.name = 'NoLabelsFoundError';
  }
}

class NoPersonFoundError extends ImageDetectionError {
  public constructor(metadata: ImageMetadata, options?: ErrorOptions) {
    super('No person found in image', metadata, options);
    this.name = 'NoPersonFoundError';
  }
}

export { ImageDetectionError, NoLabelsFoundError, NoPersonFoundError };
