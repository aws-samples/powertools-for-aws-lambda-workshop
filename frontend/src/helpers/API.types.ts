/* tslint:disable */
/* eslint-disable */
//  This file was automatically generated and should not be edited.

export type PresignedUploadUrlInput = {
  type: string;
};

export type PresignedUrl = {
  __typename: 'PresignedUrl';
  id: string;
  url: string;
};

export type FileStatusUpdateInput = {
  id?: string | null;
  status: string;
  transformedFileKey?: string | null;
};

export type File = {
  __typename: 'File';
  id?: string | null;
  status: string;
  transformedFileKey?: string | null;
};

export type onUpdateFileStatusFilterInput = {
  id?: onUpdateFileStatusStringInput | null;
  status?: onUpdateFileStatusStringInput | null;
  and?: Array<onUpdateFileStatusFilterInput | null> | null;
  or?: Array<onUpdateFileStatusFilterInput | null> | null;
};

export type onUpdateFileStatusStringInput = {
  ne?: string | null;
  eq?: string | null;
  le?: string | null;
  lt?: string | null;
  ge?: string | null;
  gt?: string | null;
  contains?: string | null;
  notContains?: string | null;
  between?: Array<string | null> | null;
  beginsWith?: string | null;
  in?: Array<string | null> | null;
  notIn?: Array<string | null> | null;
};

export type GeneratePresignedUploadUrlMutationVariables = {
  input?: PresignedUploadUrlInput | null;
};

export type GeneratePresignedUploadUrlMutation = {
  generatePresignedUploadUrl?: {
    __typename: 'PresignedUrl';
    id: string;
    url: string;
  } | null;
};

export type UpdateFileStatusMutationVariables = {
  input?: FileStatusUpdateInput | null;
};

export type UpdateFileStatusMutation = {
  updateFileStatus?: {
    __typename: 'File';
    id?: string | null;
    status: string;
    transformedFileKey?: string | null;
  } | null;
};

export type GeneratePresignedDownloadUrlQueryVariables = {
  id: string;
};

export type GeneratePresignedDownloadUrlQuery = {
  generatePresignedDownloadUrl?: {
    __typename: 'PresignedUrl';
    id: string;
    url: string;
  } | null;
};

export type OnUpdateFileStatusSubscriptionVariables = {
  filter?: onUpdateFileStatusFilterInput | null;
};

export type OnUpdateFileStatusSubscription = {
  onUpdateFileStatus?: {
    __typename: 'File';
    id?: string | null;
    status: string;
    transformedFileKey?: string | null;
  } | null;
};
