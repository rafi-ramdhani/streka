import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { expect, test, vi } from 'vitest';
import { installErrorHandlers } from './errors';

function makeApp() {
  const app = new Hono();
  installErrorHandlers(app);
  app.get('/boom', () => {
    throw new Error('kaboom');
  });
  app.get('/teapot', () => {
    throw new HTTPException(418, { message: "i'm a teapot" });
  });
  return app;
}

test('an unhandled throw becomes a JSON 500 that does not leak the message', async () => {
  const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
  const res = await makeApp().request('/boom');
  expect(res.status).toBe(500);
  expect(await res.json()).toEqual({ error: 'internal error' });
  expect(spy).toHaveBeenCalled();
  spy.mockRestore();
});

test('an HTTPException maps to its status and message as JSON', async () => {
  const res = await makeApp().request('/teapot');
  expect(res.status).toBe(418);
  expect(await res.json()).toEqual({ error: "i'm a teapot" });
});

test('an unknown route returns JSON 404', async () => {
  const res = await makeApp().request('/nope');
  expect(res.status).toBe(404);
  expect(await res.json()).toEqual({ error: 'not found' });
});
