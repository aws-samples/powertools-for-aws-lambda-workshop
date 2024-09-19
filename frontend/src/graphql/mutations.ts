/* tslint:disable */
/* eslint-disable */
// this is an auto generated file. This will be overwritten

import type * as APITypes from '../helpers/API.types';
type GeneratedMutation<InputType, OutputType> = string & {
  __generatedMutationInput: InputType;
  __generatedMutationOutput: OutputType;
};

export const generatePresignedUploadUrl = /* GraphQL */ `mutation GeneratePresignedUploadUrl($input: PresignedUploadUrlInput) {
  generatePresignedUploadUrl(input: $input) {
    id
    url
    __typename
  }
}
` as GeneratedMutation<
  APITypes.GeneratePresignedUploadUrlMutationVariables,
  APITypes.GeneratePresignedUploadUrlMutation
>;
export const updateFileStatus = /* GraphQL */ `mutation UpdateFileStatus($input: FileStatusUpdateInput) {
  updateFileStatus(input: $input) {
    id
    status
    transformedFileKey
    __typename
  }
}
` as GeneratedMutation<
  APITypes.UpdateFileStatusMutationVariables,
  APITypes.UpdateFileStatusMutation
>;
