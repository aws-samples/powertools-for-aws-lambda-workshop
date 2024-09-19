import { generateClient } from '@aws-amplify/api';
import type { GraphqlSubscriptionMessage } from '@aws-amplify/api-graphql';
import type { Subscription } from 'rxjs';

import { generatePresignedUploadUrl } from '../graphql/mutations';
import { generatePresignedDownloadUrl } from '../graphql/queries';
import { onUpdateFileStatus } from '../graphql/subscriptions';
import type {
  GeneratePresignedUploadUrlMutation,
  OnUpdateFileStatusSubscription,
  onUpdateFileStatusFilterInput,
} from './API.types';

const client = generateClient();

export const getPresignedUrl = async (
  file: File
): Promise<
  GeneratePresignedUploadUrlMutation['generatePresignedUploadUrl']
> => {
  try {
    const res = await client.graphql({
      query: generatePresignedUploadUrl,
      variables: {
        input: {
          type: file.type,
        },
      },
    });

    const data = res.data;
    if (!data) {
      console.log('Unable to get presigned url', res);
      throw new Error('Unable to get presigned url');
    }
    const { generatePresignedUploadUrl: presignedUrlResponse } = data;

    if (!presignedUrlResponse) {
      console.log('Unable to get presigned url', res);
      throw new Error('Unable to get presigned url');
    }

    return presignedUrlResponse;
  } catch (err) {
    console.error(err);
    throw err;
  }
};

export const subscribeToFileUpdates = (
  onNextHandler: (
    message: GraphqlSubscriptionMessage<OnUpdateFileStatusSubscription>
  ) => void,
  onErrorHandler: (err: unknown) => void,
  filter?: onUpdateFileStatusFilterInput
): Subscription => {
  return client
    .graphql({
      query: onUpdateFileStatus,
      variables: {
        filter,
      },
    })
    .subscribe({
      next: onNextHandler,
      error: onErrorHandler,
    });
};

export const getDownloadUrl = async (id: string): Promise<string> => {
  try {
    const res = await client.graphql({
      query: generatePresignedDownloadUrl,
      variables: {
        id,
      },
    });

    if (!res.data || !res.data.generatePresignedDownloadUrl)
      throw new Error('Unable to get presigned url');

    return res.data?.generatePresignedDownloadUrl.url;
  } catch (err) {
    console.error(err);
    throw err;
  }
};
