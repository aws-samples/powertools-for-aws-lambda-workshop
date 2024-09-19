import type { FileStatus } from '@constants';

type Detail = {
  version: string;
  bucket: {
    name: string;
  };
  object: {
    key: string;
    size: number;
    etag: string;
    sequencer: string;
  };
  'request-id': string;
  requester: string;
  'source-ip-address': string;
  reason: 'PutObject';
};

type DetailType = 'Object Created';

type FileStatusKey = keyof typeof FileStatus;
type FileStatusValue = (typeof FileStatus)[FileStatusKey];

export type { Detail, DetailType, FileStatusValue };
