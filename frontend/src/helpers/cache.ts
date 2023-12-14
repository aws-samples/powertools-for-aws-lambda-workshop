import { Cache } from 'aws-amplify/utils';

const cache = Cache.createInstance({
  storage: window.localStorage,
  keyPrefix: 'aws-lambda-powertools-workshop-',
  warningThreshold: 0.8,
  defaultPriority: 5,
  itemMaxSize: 200,
  defaultTTL: 1000 * 60 * 60 * 60 * 2,
  capacityInBytes: 5000000,
});

export default cache;
