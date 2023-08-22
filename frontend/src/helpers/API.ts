import { Observable, ZenObservable } from 'zen-observable-ts';
import { API, graphqlOperation, GraphQLResult } from '@aws-amplify/api';

import { generatePresignedUploadUrl } from '../graphql/mutations';
import { generatePresignedDownloadUrl } from '../graphql/queries';
import { onUpdateFileStatus } from '../graphql/subscriptions';
import {
  GeneratePresignedUploadUrlMutation,
  OnUpdateFileStatusSubscription,
  onUpdateFileStatusFilterInput,
  GeneratePresignedDownloadUrlQuery,
} from './API.types';

export const getPresignedUrl = async (
  file: File
): Promise<
  GeneratePresignedUploadUrlMutation['generatePresignedUploadUrl']
> => {
  try {
    const res = (await API.graphql(
      graphqlOperation(generatePresignedUploadUrl, {
        input: {
          type: file.type,
        },
      })
    )) as GraphQLResult<GeneratePresignedUploadUrlMutation>;

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
  onNextHandler: (value: {
    value: GraphQLResult<OnUpdateFileStatusSubscription>;
  }) => void,
  onErrorHandler: (err: unknown) => void,
  filter?: onUpdateFileStatusFilterInput
): ZenObservable.Subscription => {
  return (
    API.graphql(
      graphqlOperation(onUpdateFileStatus, {
        filter,
      })
    ) as Observable<object>
  ).subscribe({
    next: onNextHandler,
    error: onErrorHandler,
  });
};

export const getDownloadUrl = async (id: string) => {
  try {
    const res = (await API.graphql(
      graphqlOperation(generatePresignedDownloadUrl, {
        id,
      })
    )) as GraphQLResult<GeneratePresignedDownloadUrlQuery>;

    if (!res.data || !res.data.generatePresignedDownloadUrl)
      throw new Error('Unable to get presigned url');

    return res.data?.generatePresignedDownloadUrl.url;
  } catch (err) {
    console.error(err);
    throw err;
  }
};
