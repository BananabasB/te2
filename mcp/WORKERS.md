# MCP — Cloudflare Worker

Your MCP server lives in this folder. Follow these steps to get it live.

## 1. Index your docs

Run from your project root:

```bash
docmcp index ./docs
```

This writes `docs-data.json` in this folder with all your parsed pages.

## 2. Install dependencies

```bash
npm install
```

## 3. Deploy to Cloudflare

```bash
wrangler login   # first time only
wrangler deploy
```

Your MCP endpoint will be:

```
https://te2-wiki.YOUR-SUBDOMAIN.workers.dev/mcp
```

Find your subdomain at dash.cloudflare.com → Workers & Pages → Overview.

## 4. Connect an AI client

**Claude Code** — add to `.claude/settings.json` in your project:

```json
{
  "mcpServers": {
    "docs": { "url": "https://te2-wiki.YOUR-SUBDOMAIN.workers.dev/mcp" }
  }
}
```

**Cursor** — Settings → MCP → Add server → paste the URL above.

**Claude.ai** — Settings → Integrations → Add → paste the URL above.

## Updating

Every time your docs change, re-index and redeploy:

```bash
# from your project root
docmcp index ./docs

# from this folder
wrangler deploy
```

Or run `docmcp action` from your project root to set up a GitHub Action
that re-indexes automatically on every push.
