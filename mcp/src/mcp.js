export const TOOLS = [
  {
    name: 'list_docs',
    description: 'List all documentation pages with their titles, paths, and metadata',
    inputSchema: { type: 'object', properties: {} },
    operationId: 'docmcp_list_docs',
  },
  {
    name: 'get_doc',
    description: 'Get the full content of one or more documentation pages by path. Pass a single path string or an array of paths for a batch read. Paths are returned by list_docs and search_docs.',
    inputSchema: {
      type: 'object',
      properties: {
        path: {
          oneOf: [
            { type: 'string', description: 'A single doc path (e.g. "getting-started/installation")' },
            { type: 'array', items: { type: 'string' }, description: 'Multiple doc paths for a batch read' },
          ],
        },
      },
      required: ['path'],
    },
    operationId: 'docmcp_get_doc',
  },
  {
    name: 'search_docs',
    description: 'Search documentation pages by keywords or phrase, returning scored snippets with titles and paths. Use this for broad or conceptual queries. Follow up with get_doc to read the full content of any result.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
        limit: { type: 'number', description: 'Max results to return (default 5, max 20)' },
        scoreThreshold: { type: 'number', description: 'Minimum relevance score 0–1 (default 0)' },
        version: { type: 'string', description: 'Filter results to a specific version' },
        language: { type: 'string', description: 'Filter results to a specific language code (e.g. "en")' },
      },
      required: ['query'],
    },
    operationId: 'docmcp_search_docs',
  },
];

export function handleMcp(req, index) {
  const id = req.id ?? null;

  if (req.id === undefined && req.method?.startsWith('notifications/')) return null;

  switch (req.method) {
    case 'initialize':
      return {
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: { tools: {} },
          serverInfo: { name: 'docmcp', version: '0.1.0' },
        },
      };

    case 'ping':
      return { jsonrpc: '2.0', id, result: {} };

    case 'tools/list':
      return { jsonrpc: '2.0', id, result: { tools: TOOLS } };

    case 'tools/call': {
      const { name, arguments: args = {} } = req.params ?? {};
      return { jsonrpc: '2.0', id, result: callTool(name, args, index) };
    }

    default:
      return {
        jsonrpc: '2.0',
        id,
        error: { code: -32601, message: `Method not found: ${req.method}` },
      };
  }
}

function callTool(name, args, index) {
  switch (name) {
    case 'list_docs': {
      if (!index.docs.length) {
        return { content: [{ type: 'text', text: 'No docs indexed yet. Run the CLI to index your docs.' }] };
      }
      const text = index.docs
        .map(d => {
          let line = `${d.path}  —  ${d.title}`;
          if (d.description) line += `\n  ${d.description}`;
          const meta = [d.version, d.language, ...(d.tags ?? [])].filter(Boolean).join(', ');
          if (meta) line += `\n  [${meta}]`;
          return line;
        })
        .join('\n');
      return { content: [{ type: 'text', text }] };
    }

    case 'get_doc': {
      const paths = Array.isArray(args.path) ? args.path : [String(args.path ?? '')];
      const results = [];
      const notFound = [];

      for (const p of paths) {
        const doc = index.docs.find(
          d => d.path === p || d.id === p || d.url === p || d.url === '/' + p
        );
        if (!doc) {
          notFound.push(p);
        } else {
          const body = [`# ${doc.title}`];
          if (doc.description) body.push(`\n> ${doc.description}`);
          body.push('', doc.content);
          results.push(body.join('\n'));
        }
      }

      if (notFound.length && !results.length) {
        return {
          content: [{ type: 'text', text: `Doc(s) not found: ${notFound.map(p => `"${p}"`).join(', ')}. Use list_docs to see available paths.` }],
          isError: true,
        };
      }

      if (notFound.length) results.push(`\n> Not found: ${notFound.map(p => `"${p}"`).join(', ')}`);
      return { content: [{ type: 'text', text: results.join('\n\n---\n\n') }] };
    }

    case 'search_docs': {
      const query = String(args.query ?? '').trim();
      const limit = Math.min(Number(args.limit ?? 5), 20);
      const scoreThreshold = Number(args.scoreThreshold ?? 0);
      const filterVersion = args.version ? String(args.version) : null;
      const filterLanguage = args.language ? String(args.language) : null;
      if (!query) return { content: [{ type: 'text', text: 'Query cannot be empty.' }], isError: true };

      let pool = index.docs;
      if (filterVersion) pool = pool.filter(d => d.version === filterVersion);
      if (filterLanguage) pool = pool.filter(d => d.language === filterLanguage);

      const results = searchDocs(pool, query, limit, scoreThreshold);
      if (!results.length) return { content: [{ type: 'text', text: `No results found for: "${query}"` }] };

      const text = results
        .map(d => {
          const snippet = extractSnippet(d.content, query);
          const meta = [d.version, d.language].filter(Boolean).join(', ');
          return `**${d.title}** (\`${d.path}\`)${d.url ? `  →  ${d.url}` : ''}${meta ? `  [${meta}]` : ''}\n${d.description || snippet}`;
        })
        .join('\n\n');
      return { content: [{ type: 'text', text }] };
    }

    default:
      return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true };
  }
}

function searchDocs(docs, query, limit, scoreThreshold = 0) {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const scored = docs.map(doc => {
    const haystack = `${doc.title} ${doc.description} ${doc.content}`.toLowerCase();
    const titleHaystack = doc.title.toLowerCase();
    const tagHaystack = (doc.tags ?? []).join(' ').toLowerCase();
    const raw = words.reduce((s, w) => {
      const inTitle = (titleHaystack.split(w).length - 1) * 3;
      const inTags = (tagHaystack.split(w).length - 1) * 2;
      const inBody = haystack.split(w).length - 1;
      return s + inTitle + inTags + inBody;
    }, 0);
    return { doc, score: raw };
  }).filter(r => r.score > 0);

  if (!scored.length) return [];

  const maxScore = scored.reduce((m, r) => Math.max(m, r.score), 0);
  return scored
    .map(r => ({ ...r, normalised: r.score / maxScore }))
    .filter(r => r.normalised >= scoreThreshold)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(r => r.doc);
}

function extractSnippet(content, query) {
  const word = query.toLowerCase().split(/\s+/)[0];
  const idx = content.toLowerCase().indexOf(word);
  const start = Math.max(0, idx - 60);
  const end = Math.min(content.length, idx + 180);
  const snippet = content.slice(start, end).replace(/\n+/g, ' ').trim();
  return (start > 0 ? '...' : '') + snippet + (end < content.length ? '...' : '');
}
