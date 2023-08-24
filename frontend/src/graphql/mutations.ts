/* tslint:disable */
/* eslint-disable */
// this is an auto generated file. This will be overwritten

export const generatePresignedUploadUrl = /* GraphQL */ `
  mutation GeneratePresignedUploadUrl($input: PresignedUploadUrlInput) {
    generatePresignedUploadUrl(input: $input) {
      id
      url
    }
  }
`;
export const updateFileStatus = /* GraphQL */ `
  mutation UpdateFileStatus($input: FileStatusUpdateInput) {
    updateFileStatus(input: $input) {
      id
      status
      transformedFileKey
    }
  }
`;
