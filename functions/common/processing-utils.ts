import { FileStatuses, markFileAs } from './appsync-iam-client';
import { dynamodbClientV3 } from './dynamodb-client';

export interface TransformParams {
  width: number
  height?: number
}

/**
 * @param {string} id - The id of the item to retrieve
 * @param {string} tableName - The name of the table to use
 */
interface GetTransformParamsProps {
  id: string
  tableName: string
}

const getTransformParams = async (
  props: GetTransformParamsProps
): Promise<string> => {
  const res = await dynamodbClientV3.get({
    TableName: props.tableName,
    Key: {
      id: props.id,
    },
    ProjectionExpression: 'transformParams',
  });
  if (!res.Item) throw new Error(`Unable to find item with id ${props.id}`);

  return res.Item.transformParams;
};

/**
 * Utility function to retrieve the transformation parameters of a given video.
 *
 * It takes a video id and a table name, then queries the DynamoDB table and returns width & height in pixels.
 *
 * @param {GetTransformParamsProps} props - Parameters that include the video id and table name
 * @returns The width and height in px used to process the video
 */
export const getVideoTransformParams = async (
  props: GetTransformParamsProps
): Promise<TransformParams> => {
  const transformParams = await getTransformParams(props);
  switch (transformParams) {
    case '480p':
      return { width: 720, height: 480 };
    case '720p':
      return { width: 1280, height: 720 };
    case '1080p':
      return { width: 1920, height: 1080 };
    default:
      return { width: 720, height: 480 };
  }
};

/**
 * Utility function to retrieve the transformation parameters of a given image.
 *
 * It takes an image id and a table name, then queries the DynamoDB table and returns width & height in pixels.
 *
 * @param {GetTransformParamsProps} props - Parameters that include the image id and table name
 * @returns The width and height in px used to process the image
 */
export const getImageTransformParams = async (
  props: GetTransformParamsProps
): Promise<TransformParams> => {
  const transformParams = await getTransformParams(props);
  switch (transformParams) {
    case 'small':
      return { width: 720, height: 480 };
    case 'medium':
      return { width: 1280, height: 720 };
    case 'large':
      return { width: 1920, height: 1080 };
    default:
      return { width: 720, height: 480 };
  }
};

/**
 * Small utility to help keep track of messages processed and messages still pending.
 *
 * Once initialized within the function's handler, add items (with `markStarted({ id: string, msgId: string})`)
 * to it as soon as you start processing them.
 *
 * Then, once you're done processing one, mark it as processed via `markProcessed(id: string)`.
 *
 * If an item fails, mark it as such via `markFailed(id: string)`.
 *
 * Finally, if at some point you need to know how many items are still pending (i.e. when function is about to timeout),
 * call `getUnprocessed()` to get an iterable with the items still pending.
 *
 * Likewise, if you need to get the failed items, call `getFailed()` to get an iterable with these items.
 */
export class ItemsListKeeper {
  private items: Map<string, string>;
  private processed: Map<string, string>;
  private failed: Map<string, string>;

  constructor() {
    this.items = new Map();
    this.processed = new Map();
    this.failed = new Map();
  }

  private getItem(id: string) {
    try {
      const itemToRemove = this.items.get(id);
      if (!itemToRemove) throw new Error('Unable to find item in ItemsList');
      
      return itemToRemove;
    } catch (err) {
      throw err;
    }
  }

  /**
   * Marks an item as "in-progress" in the DynamoDB, triggers an AppSync mutation, and adds it to the local list.
   *
   * @param {{ id: string; msgId: string }} param - Object containing fileId & message id
   */
  async markStarted({ id, msgId }: { id: string; msgId: string }) {
    this.items.set(id, msgId);
    await markFileAs(id, FileStatuses.WORKING);
  }

  /**
   * Marks an item as "done" in the DynamoDB, triggers an AppSync mutation, and adds it to the local list.
   *
   * @param id - id of the file being acted upon
   */
  async markProcessed(id: string) {
    const itemToRemove = this.getItem(id);
    this.processed.set(id, itemToRemove);
    this.items.delete(id);
    await markFileAs(id, FileStatuses.DONE);
  }

  /**
   * Marks an item as "failed" in the DynamoDB, triggers an AppSync mutation, and adds it to the local list.
   *
   * @param id - id of the file being acted upon
   */
  async markFailed(id: string) {
    const itemToRemove = this.getItem(id);
    this.failed.set(id, itemToRemove);
    this.items.delete(id);
    await markFileAs(id, FileStatuses.FAIL);
  }

  /**
   * Get all the items still left unprocessed / to process
   */
  getUnprocessed() {
    return this.items.entries();
  }

  /**
   * Get all the failed items
   */
  getFailed() {
    return this.failed.entries();
  }
}

/**
 * Timeout Symbol sent along the promise rejection.
 *
 * @example
 * ```ts
 * try {
 *   const myLongAsyncOperation;
 *   await timedOutAsyncOperation(
 *     myLongAsyncOperation,
 *     context.getRemainingTimeInMillis() - 5000
 *   )
 * } catch (err) {
 *   if (err === TimeoutErr) {
 *     // handle timeout here
 *   }
 *   // handle other errors
 * }
 * ```
 */
export const TimeoutErr = Symbol();

/**
 * Utility function to help handle Lambda time out.
 *
 * The function creates a Promise.race between your long runing async operation
 * and an artificial timeout.
 *
 * By specifying a shorter timeout than the function's one, you're given some buffer
 * to handle cleanup operations and/or gracefully handle failures.
 *
 * **Note:** The timeout is **not** guaranteed due to how Node.js handles event loop and timeouts.
 *
 * @example
 * ```ts
 * try {
 *   const myLongAsyncOperation;
 *   await timedOutAsyncOperation(
 *     myLongAsyncOperation,
 *     context.getRemainingTimeInMillis() - 5000
 *   )
 * } catch (err) {
 *   if (err === TimeoutErr) {
 *     // handle timeout here
 *   }
 *   // handle other errors
 * }
 * ```
 *
 * @param {any} prom - Promise that does a time consuming async operation
 * @param {number} time - Max time to trigger a timeout rejection in milliseconds (suggested `context.getRemainingTimeInMillis() - ms`)
 */
export const timedOutAsyncOperation = async (prom: any, time: number) => await Promise.race([
  prom,
  new Promise((_r, rej) => {
    const timer = setTimeout(() => rej(TimeoutErr), time);
    timer.unref();
  }),
]);

/**
 * Utility function to parse and extract the object key from the body of a SQS Record.
 *
 * Given a stringified representation of a body like this:
 * ```json
 * {
 *   "detail": {
 *     "object": {
 *       "key": "uploads/images/jpg/79894e50c10c40889087194b76c5f1cb.jpg"
 *     }
 *   }
 * }
 * ```
 *
 * It returns `uploads/images/jpg/79894e50c10c40889087194b76c5f1cb.jpg`.
 *
 * @param {string} body - Body of the SQS message
 */
export const getObjectKey = (body: string) => {
  const {
    detail: {
      object: { key: objectKey },
    },
  } = JSON.parse(body);

  return objectKey;
};

/**
 * Utility function to extract the file id from a S3 Object key.
 *
 * Given this key `uploads/images/jpg/79894e50c10c40889087194b76c5f1cb.jpg`, it returns `79894e50c10c40889087194b76c5f1cb`.
 *
 * @param {string} objectKey - Key of the S3 object
 */
export const getFileId = (objectKey: string) =>
  objectKey.split('/').at(-1)!.split('.')[0];
