/* tslint:disable */
/* eslint-disable */
// this is an auto generated file. This will be overwritten

import type * as APITypes from '../helpers/API.types';
type GeneratedQuery<InputType, OutputType> = string & {
  __generatedQueryInput: InputType;
  __generatedQueryOutput: OutputType;
};

export const generatePresignedDownloadUrl = /* GraphQL */ `query GeneratePresignedDownloadUrl($id: String!) {
  generatePresignedDownloadUrl(id: $id) {
    id
    url
    __typename
  }
}
` as GeneratedQuery<
  APITypes.GeneratePresignedDownloadUrlQueryVariables,
  APITypes.GeneratePresignedDownloadUrlQuery
>;
