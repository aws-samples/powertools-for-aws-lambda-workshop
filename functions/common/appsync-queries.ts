export const UpdateFileStatusMutation = `mutation UpdateFileStatus($input: FileStatusUpdateInput!) {
  updateFileStatus(input: $input) {
    id
    status
  }
}`;

export const GetPresignedUrlMutation = `mutation GeneratePresignedUrl($input: PresignedUrlInput!) {
  generatePresignedUrl(input: $input) {
    url
  }
}`;
