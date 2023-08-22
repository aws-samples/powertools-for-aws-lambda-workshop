import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { setGlobalDispatcher, MockAgent } from 'undici';
import { makeGraphQlOperation } from '../commons/appsync-signed-operation';
import type { Interceptable } from 'undici';

let mockAgent: MockAgent;
let mockPool: Interceptable;

beforeEach(() => {
  mockAgent = new MockAgent({
    keepAliveTimeout: 100,
    keepAliveMaxTimeout: 500,
  });
  mockAgent.disableNetConnect();
  setGlobalDispatcher(mockAgent);
  mockPool = mockAgent.get('https://example.com');
  process.env.APPSYNC_ENDPOINT = 'https://example.com';
  process.env.AWS_REGION = 'us-east-1';
  process.env.AWS_ACCESS_KEY_ID = 'test';
  process.env.AWS_SECRET_ACCESS_KEY = 'test';
});

afterEach(async () => {
  await mockAgent.close();
});

describe('Function: makeGraphQlOperation', () => {
  it('returns the data when response is successful', async () => {
    // Prepare
    mockPool
      .intercept({
        method: 'POST',
        path: '/',
      })
      .reply(200, { data: 'success' });

    // Act
    const result = await makeGraphQlOperation('https://example.com', {
      query: 'query {}',
    });

    // Assess
    expect(result).toEqual('success');
  });
  it('throws an error when the API returns errors in the response body', async () => {
    // Prepare
    mockPool
      .intercept({
        method: 'POST',
        path: '/',
      })
      .reply(200, { errors: [{ message: 'something went wrong' }] });
    const consoleErrorSpy = vi.spyOn(console, 'error');

    // Act & Assess
    await expect(
      makeGraphQlOperation('https://example.com', {
        query: 'query {}',
      })
    ).rejects.toThrow('Failed to execute GraphQL operation');
    expect(consoleErrorSpy).toHaveBeenCalledOnce();
  });
  it('throws an error when the API returns a non-200 response', async () => {
    // Prepare
    mockPool
      .intercept({
        method: 'POST',
        path: '/',
      })
      .reply(500, { data: 'failure' });
    const consoleErrorSpy = vi.spyOn(console, 'error');

    // Act & Assess
    await expect(
      makeGraphQlOperation('https://example.com', {
        query: 'query {}',
      })
    ).rejects.toThrow('Failed to execute GraphQL operation');
    expect(consoleErrorSpy).toHaveBeenCalledOnce();
  });
});
