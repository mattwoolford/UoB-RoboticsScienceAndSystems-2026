import type { DashboardState, SavedWorkbook } from '../types/dashboard';

/** Fail visibly on HTTP errors and bound requests so a stalled bridge cannot queue actions. */
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/${path}`, {
    ...init,
    signal: AbortSignal.timeout(5000),
    cache: 'no-store',
  });
  const body = await response.json().catch(() => null);
  if (!response.ok)
    throw new Error(
      body?.error ?? `Bridge request failed (${response.status}).`,
    );
  if (body === null)
    throw new Error('The bridge returned an invalid response.');
  return body as T;
}
export const getState = () => request<DashboardState>('state');
export const getWorkbooks = () => request<SavedWorkbook[]>('results/workbooks');
export const deleteWorkbook = (filename: string) =>
  request(`results/workbooks/${encodeURIComponent(filename)}`, {
    method: 'DELETE',
  });
export const post = <T = unknown>(path: string, payload: object = {}) =>
  request<T>(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
