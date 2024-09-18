import { makeGraphQlOperation } from '@commons/appsync-signed-operation';
import { updateFileStatus } from '@graphql/mutations';
import type { FileStatusValue } from './types';

/**
 * Utility function to update the status of a given asset.
 *
 * It takes a fileId and a status and it triggers an AppSync Mutation.
 * The mutation has two side effects:
 * - Write the new state in the DynamoDB Table
 * - Forward the update to any subscribed client (i.e. the frontend app)
 *
 * @param {string} fileId - The id of the file to update
 * @param {FileStatusValue} status - Status of the file after the mutation update
 */
const markFileAs = async (
  fileId: string,
  status: FileStatusValue
): Promise<void> => {
  await makeGraphQlOperation(process.env.APPSYNC_ENDPOINT || '', {
    query: updateFileStatus,
    operationName: 'UpdateFileStatus',
    variables: {
      input: {
        id: fileId,
        status,
      },
    },
  });
};

export { markFileAs };
