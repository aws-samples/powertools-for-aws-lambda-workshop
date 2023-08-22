import { BrowserStorageCache } from '@aws-amplify/cache';

const cache = BrowserStorageCache.createInstance({
  storage: window.localStorage,
  keyPrefix: 'aws-lambda-powertools-workshop-',
});

export default cache;
