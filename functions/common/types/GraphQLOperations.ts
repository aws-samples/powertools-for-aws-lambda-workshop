import type { FileStatus, FileType } from "./File";

type GraphQLOperation<T> = {
  query: string;
  operationName?: string;
  variables: T;
};

type GeneratePresignedUrlMutationInputs = {
  input: {
    type: FileType;
  };
};

type UpdateFileStatusMutationInputs = {
  input: {
    id: string;
    status: FileStatus;
  };
};

export type {
  GraphQLOperation,
  UpdateFileStatusMutationInputs,
  GeneratePresignedUrlMutationInputs,
};
