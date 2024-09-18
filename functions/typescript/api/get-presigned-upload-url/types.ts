type GetPresignedUploadUrlParams = {
  key: string;
  bucketName: string;
  type: string;
  metadata: Record<string, string>;
};

type StoreFileMetadataParams = {
  id: string;
  key: string;
  type: string;
  userId: string;
  transformParams?: string;
  dynamodb: {
    tableName: string;
  };
};

export type { GetPresignedUploadUrlParams, StoreFileMetadataParams };
