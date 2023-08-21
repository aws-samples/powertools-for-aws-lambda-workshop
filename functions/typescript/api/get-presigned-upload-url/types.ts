type GetPresignedUploadUrlParams = {
  key: string;
  bucketName: string;
  type: string;
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

export { GetPresignedUploadUrlParams, StoreFileMetadataParams };
