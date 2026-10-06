import { expect, request } from '@playwright/test';
import { urls, type Credentials } from './config.js';

export async function accessToken(credentials: Credentials): Promise<string> {
  const { apiUrl } = urls();
  const context = await request.newContext();
  const response = await context.post(`${apiUrl}/api/v1/auth/login`, { data: credentials });
  await expect(response).toBeOK();
  const body = await response.json() as { data: { tokens: { accessToken: string } } };
  await context.dispose();
  return body.data.tokens.accessToken;
}

export async function expectApiStatus(path: string, status: number, token?: string): Promise<void> {
  const { apiUrl } = urls();
  const context = await request.newContext({ extraHTTPHeaders: token ? { Authorization: `Bearer ${token}` } : {} });
  const response = await context.get(`${apiUrl}${path}`);
  expect(response.status()).toBe(status);
  await context.dispose();
}

export async function getAuthenticated(path: string, credentials: Credentials) {
  const { apiUrl } = urls();
  const token = await accessToken(credentials);
  const context = await request.newContext({ extraHTTPHeaders: { Authorization: `Bearer ${token}` } });
  const response = await context.get(`${apiUrl}${path}`);
  await context.dispose();
  return response;
}
