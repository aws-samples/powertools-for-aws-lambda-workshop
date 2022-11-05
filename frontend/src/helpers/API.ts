import { Observable, ZenObservable } from "zen-observable-ts";
import { API, graphqlOperation, GraphQLResult } from "@aws-amplify/api";

import { generatePresignedUrl } from "../graphql/mutations";
import { onUpdateFileStatus } from "../graphql/subscriptions";
import {
  GeneratePresignedUrlMutation,
  OnUpdateFileStatusSubscription,
  onUpdateFileStatusFilterInput,
} from "./API.types";
import cache from "./Cache";

export const getPresignedUrl = async (
  file: File
): Promise<GeneratePresignedUrlMutation["generatePresignedUrl"]> => {
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
      graphqlOperation(generatePresignedUrl, {
        input: {
          type: file.type,
          transformParams,
        },
      })
    )) as GraphQLResult<GeneratePresignedUrlMutation>;

    if (!res.data || !res.data.generatePresignedUrl)
      throw new Error("Unable to get presigned url");

    return res.data?.generatePresignedUrl!;
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
