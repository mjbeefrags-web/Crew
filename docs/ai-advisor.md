# Owner Advisor — RAG + MCP

The admin dashboard now includes a **Next Move** panel. It reads the current
analytics snapshot, retrieves the bundled CREWWW operating playbook and returns
prioritised, evidence-backed recommendations. It never changes stock, prices or
orders by itself — every move stays an owner decision.

## How it works

1. The dashboard sends a compact snapshot (KPIs, product/drop/collection/search
   breakdowns) to `POST /api/v1/admin/ai/advise`. The route is admin-only.
2. `backend/app/ai/advisor.py` tokenises the optional question plus the signal
   keys and runs BM25-like retrieval over `backend/app/ai/corpus.md` (headings
   become chunks). The retrieved excerpts are the RAG context.
3. The **local provider** (default, no credentials) combines those excerpts with
   deterministic rules for stock, conversion, retention, leading products, quiet
   drops and searches. It is reproducible and safe for CI.
4. The **OpenAI-compatible provider** can be enabled with `AI_PROVIDER=openai`,
   `AI_API_URL`, `AI_API_KEY` and `AI_MODEL`. If that call fails, the advisor
   falls back to the local provider rather than showing an error to the owner.
5. Sources are displayed under “Why this advice”, so the owner can see exactly
   which playbook entries informed the recommendation.

## MCP surface

`GET /api/v1/admin/ai/tools` returns an MCP-compatible tool manifest:

- `crewww_advise` — inputs: `signals` (object), `question` (string). Calls the
  same advisor endpoint.
- `crewww_rag_search` — inputs: `query` (string), `limit` (integer). Retrieves
  playbook chunks.

An MCP bridge can expose these two tools to a desktop assistant without giving
it database credentials: the API enforces the admin session, and the tools only
read curated context plus the supplied snapshot.

## Configuration

```bash
AI_PROVIDER=local       # or openai
AI_API_URL=             # OpenAI-compatible /chat/completions URL
AI_API_KEY=             # secret, never commit
AI_MODEL=gpt-4o-mini
```

These values are passed into the API container through `compose.yaml`. Template
files (`.env.example`, staging and production) document them without secrets.

## Scaling notes

When real stock and drop-product links land, replace the editorial slug map in
`src/services/adminAnalytics.ts` with backend drop attribution and include those
fields in `signals`. The retrieval corpus is a file today; for many more drops,
move it to a vector store keyed by drop slug while keeping the same tool
interface. Advice remains advisory until an owner approves a workflow action.
