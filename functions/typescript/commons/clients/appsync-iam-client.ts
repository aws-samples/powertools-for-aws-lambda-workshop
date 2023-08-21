import { updateFileStatus } from '@graphql/mutations';

export enum FileStatuses {
  QUEUED = 'queued',
  WORKING = 'in-progress',
  DONE = 'completed',
  FAIL = 'failed',
}

/**
 * Utility function to update the status of a given asset.
 *
 * It takes a fileId and a status and it triggers an AppSync Mutation.
 * The mutation has two side effects:
 * - Write the new state in the DynamoDB Table
 * - Forward the update to any subscribed client (i.e. the frontend app)
 *
 * @param {string} fileId - The id of the file to update
 * @param {FileStatus} status - Status of the file after the mutation update
 */
export const markFileAs = async (fileId: string, status: FileStatus) => {
  const graphQLOperation = {
    query: updateFileStatus,
    operationName: 'UpdateFileStatus',
    variables: {
      input: {
        id: fileId,
        status,
      },
    },
  };
  await appSyncIamClient.send(graphQLOperation);
};
