const ImageSize = {
  SMALL: 'small',
  MEDIUM: 'medium',
  LARGE: 'large',
} as const;

const FileStatus = {
  QUEUED: 'queued',
  WORKING: 'in-progress',
  DONE: 'completed',
  FAIL: 'failed',
} as const;

const TransformSize = {
  [ImageSize.SMALL]: { width: 720, height: 480 },
  [ImageSize.MEDIUM]: { width: 1280, height: 720 },
  [ImageSize.LARGE]: { width: 1920, height: 1080 },
} as const;

const transformedImagePrefix = 'transformed/image/jpg';
const transformedImageExtension = '.jpeg';

export {
  ImageSize,
  FileStatus,
  TransformSize,
  transformedImagePrefix,
  transformedImageExtension,
};
