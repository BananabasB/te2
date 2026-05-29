import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { handleMcp, TOOLS } from './mcp.js';
import docsData from '../docs-data.json';

const index = docsData;

const app = new Hono();

app.use('*', cors({ origin: '*', allowMethods: ['GET', 'POST', 'OPTIONS'], allowHeaders: ['Content-Type', 'Authorization'] }));

app.get('/', c =>
  c.json({
    name: 'docmcp',
    totalDocs: index.meta?.totalDocs ?? 0,
    framework: index.meta?.framework ?? 'unknown',
    indexedAt: index.meta?.indexedAt ?? null,
    endpoint: '/mcp',
  })
);

app.post('/mcp', async c => {
  let body;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } }, 400);
  }

  if (Array.isArray(body)) {
    const responses = body.map(req => handleMcp(req, index)).filter(Boolean);
    return c.json(responses);
  }

  const response = handleMcp(body, index);
  if (!response) return new Response(null, { status: 202 });
  return c.json(response);
});

app.get('/mcp', c => {
  const toolsMap = Object.fromEntries(TOOLS.map(t => [t.name, t]));
  return c.json({
    server: {
      name: index.meta?.name ?? 'docmcp',
      version: '0.1.0',
      transport: 'http',
    },
    capabilities: {
      tools: toolsMap,
      resources: [],
      prompts: [],
    },
  });
});

export default app;
