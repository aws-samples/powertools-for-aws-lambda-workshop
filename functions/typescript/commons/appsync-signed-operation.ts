import {
  type BinaryLike,
  type Hmac,
  type KeyObject,
  createHash,
  createHmac,
} from 'node:crypto';
import { URL } from 'node:url';
import { HttpRequest } from '@smithy/protocol-http';
import { SignatureV4 } from '@smithy/signature-v4';
import { logger } from './powertools';

class Sha256 {
  private readonly hash: Hmac;

  public constructor(secret?: unknown) {
    this.hash = secret
      ? createHmac('sha256', secret as BinaryLike | KeyObject)
      : createHash('sha256');
  }

  public digest(): Promise<Uint8Array> {
    const buffer = this.hash.digest();

    return Promise.resolve(new Uint8Array(buffer.buffer));
  }

  public update(array: Uint8Array): void {
    this.hash.update(array);
  }
}

const signer = new SignatureV4({
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? '',
    sessionToken: process.env.AWS_SESSION_TOKEN ?? '',
  },
  service: 'appsync',
  region: process.env.AWS_REGION ?? '',
  sha256: Sha256,
});

const buildHttpRequest = (apiUrl: string, query: unknown): HttpRequest => {
  const url = new URL(apiUrl);

  return new HttpRequest({
    hostname: url.hostname,
    path: url.pathname,
    body: JSON.stringify(query),
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      host: url.hostname,
    },
  });
};

const makeGraphQlOperation = async (
  apiUrl: string,
  query: unknown
): Promise<Record<string, unknown>> => {
  // Build the HTTP request to be signed
  const httpRequest = buildHttpRequest(apiUrl, query);
  // Sign the request
  const signedHttpRequest = await signer.sign(httpRequest);
  try {
    // Send the request
    const result = await fetch(apiUrl, {
      headers: new Headers(signedHttpRequest.headers),
      body: signedHttpRequest.body,
      method: signedHttpRequest.method,
    });

    if (!result.ok) throw new Error(result.statusText);

    const body = (await result.json()) as {
      data: Record<string, unknown>;
      errors: { message: string; errorType: string }[];
    };

    if (body?.errors) throw new Error(body.errors[0].message);

    return body.data;
  } catch (err) {
    logger.error('Failed to execute GraphQL operation', err as Error);
    throw new Error('Failed to execute GraphQL operation', { cause: err });
  }
};

export { makeGraphQlOperation };
