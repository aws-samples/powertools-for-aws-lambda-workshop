export const UpdateFileStatusMutation = `mutation UpdateFileStatus($input: FileStatusUpdateInput!) {
  updateFileStatus(input: $input) {
    id
    status
  }
}`;
