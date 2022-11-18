type Detail = {
  version: string
  bucket: {
    name: string
  }
  object: {
    key: string
    size: number
    etag: string
    sequencer: string
  }
  'request-id': string
  requester: string
  'source-ip-address': string
  reason: 'PutObject'
};

type DetailType = 'Object Created';

export { Detail, DetailType };
