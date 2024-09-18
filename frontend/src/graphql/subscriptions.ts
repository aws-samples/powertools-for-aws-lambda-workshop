/* tslint:disable */
/* eslint-disable */
// this is an auto generated file. This will be overwritten

import type * as APITypes from '../helpers/API.types';
type GeneratedSubscription<InputType, OutputType> = string & {
  __generatedSubscriptionInput: InputType;
  __generatedSubscriptionOutput: OutputType;
};

export const onUpdateFileStatus = /* GraphQL */ `subscription OnUpdateFileStatus($filter: onUpdateFileStatusFilterInput) {
  onUpdateFileStatus(filter: $filter) {
    id
    status
    transformedFileKey
    __typename
  }
}
` as GeneratedSubscription<
  APITypes.OnUpdateFileStatusSubscriptionVariables,
  APITypes.OnUpdateFileStatusSubscription
>;
