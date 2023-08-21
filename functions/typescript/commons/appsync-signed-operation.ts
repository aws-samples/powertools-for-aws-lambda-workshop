import { Sha256 } from '@aws-crypto/sha256-js';
import { defaultProvider } from '@aws-sdk/credential-provider-node';
import { HttpRequest } from '@aws-sdk/protocol-http';
import { SignatureV4 } from '@aws-sdk/signature-v4';
import { URL } from 'url';
import { Headers, fetch } from 'undici';

const signer = new SignatureV4({
  credentials: defaultProvider(),
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
      body: JSON.stringify(signedHttpRequest.body),
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
    console.error(err);
    throw new Error('Failed to execute GraphQL operation');
  }
};

export { makeGraphQlOperation };
