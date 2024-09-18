type GetFileKeyParams = {
  fileId: string;
  userId: string;
  dynamodb: {
    tableName: string;
    indexName: string;
  };
};

type GetPresignedDownloadUrlParams = {
  objectKey: string;
  bucketName: string;
};

export type { GetFileKeyParams, GetPresignedDownloadUrlParams };
