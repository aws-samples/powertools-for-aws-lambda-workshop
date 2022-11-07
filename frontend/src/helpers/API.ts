import { Observable, ZenObservable } from "zen-observable-ts";
import { API, graphqlOperation, GraphQLResult } from "@aws-amplify/api";

import { generatePresignedUploadUrl } from "../graphql/mutations";
import { generatePresignedDownloadUrl } from "../graphql/queries";
import { onUpdateFileStatus } from "../graphql/subscriptions";
import {
  GeneratePresignedUploadUrlMutation,
  OnUpdateFileStatusSubscription,
  onUpdateFileStatusFilterInput,
  GeneratePresignedDownloadUrlQuery,
} from "./API.types";
import cache from "./cache";

export const getPresignedUrl = async (
  file: File
): Promise<
  GeneratePresignedUploadUrlMutation["generatePresignedUploadUrl"]
> => {
  let transformParams;
  if (file.type.startsWith("image")) {
    transformParams = cache.getItem("images-settings", {
      callback: () => {
        cache.setItem("images-settings", "hd");
        return "hd";
      },
    });
  } else if (file.type.startsWith("video")) {
    transformParams = cache.getItem("videos-settings", {
      callback: () => {
        cache.setItem("videos-settings", "720p");
        return "720p";
      },
    });
  }

  try {
    const res = (await API.graphql(
      graphqlOperation(generatePresignedUploadUrl, {
        input: {
          type: file.type,
          transformParams,
        },
      })
    )) as GraphQLResult<GeneratePresignedUploadUrlMutation>;

    if (!res.data || !res.data.generatePresignedUploadUrl)
      throw new Error("Unable to get presigned url");

    return res.data?.generatePresignedUploadUrl!;
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
      throw new Error("Unable to get presigned url");

    return res.data?.generatePresignedDownloadUrl.url;
  } catch (err) {
    console.error(err);
    throw err;
  }
};
