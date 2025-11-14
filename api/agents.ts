import type { VercelRequest, VercelResponse } from '@vercel/node';

export interface MockRequest extends Partial<VercelRequest> {
  body?: any;
  query?: Record<string, string>;
  method?: string;
}

export type MockResponsePayload = { status: number; json?: any; text?: string };

export function createMockResponse() {
  const payload: MockResponsePayload = { status: 200 };
  const res = {
    status(code: number) {
      payload.status = code;
      return res;
    },
    json(data: any) {
      payload.json = data;
      return res;
    },
    send(data: any) {
      payload.text = data;
      return res;
    },
  } as unknown as VercelResponse;
  return { res, payload };
}

export function createMockRequest(options: MockRequest = {}): VercelRequest {
  return {
    query: options.query ?? {},
    body: options.body ?? {},
    method: options.method ?? 'GET',
  } as VercelRequest;
}
