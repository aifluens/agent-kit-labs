# agent-kit-labs

## What is this?

This is runnable code for an **AI customer-support agent** — a help-desk / billing
assistant that greets a customer, looks up their account and orders, and can issue
a refund. You run it on your own machine with your own API key.

It exists for **learning**. Working through the labs in order gives you an
end-to-end picture of how a real AI agent is built — from a single prompt, to
tools, to searching your own documents, to talking to external services — and what
the production version of each piece looks like.

The same code runs on the hosted **AIFluensLab** platform. This repo is just that
code, packaged so you can run it locally with your own provider key — no account
and no telemetry. It installs the public
[`@aifluens/agent-kit`](https://www.npmjs.com/package/@aifluens/agent-kit) package
and runs the real lab files.

> **Get the repo:** `git clone https://github.com/aifluens/agent-kit-labs.git`,
> then follow Setup below.

---

## Project layout

```
agent-kit-labs/
├─ package.json          # installs the package + defines the run scripts
├─ .env.example          # copy to .env and add your key
├─ labs/                 # the lab code you run
│  ├─ _shared/model.ts                  # one place that picks the model for every lab
│  ├─ m1-llm-foundations/agent.ts
│  ├─ m2-tool-use/agent.ts
│  ├─ m3-knowledge-bases/ingest.ts      # read-only example (see below)
│  ├─ m4-vector-search-rag/retriever.ts
│  ├─ m5-mcp-tools/agent-mcp.ts
│  ├─ m5-mcp-tools/agent-http.ts
│  └─ m9-agent-to-agent/agent.ts
├─ docs/                 # sample documents the RAG lab searches
└─ servers/helpdesk.mjs  # a small local Help Desk server for the connections lab
```

---

## Setup

Do steps 1–3 once. Step 4 (the database) is only needed before the **Vector search
/ RAG** lab — the earlier labs need nothing but an API key.

### 1. Prerequisites

| Tool | Needed for |
| --- | --- |
| **Node.js ≥ 20.12** and **npm** | everything |
| **An OpenAI _or_ Anthropic API key** | running any lab |
| **Docker** | the Vector search / RAG lab only |

Nothing is installed globally — the TypeScript runner (`tsx`) comes in with
`npm install` and is used through the `npm run …` scripts.

### 2. Install

```bash
npm install
```

### 3. Add your API key

```bash
cp .env.example .env
```

Open `.env` and paste your key. By default it's set up for OpenAI
(`LLM_PROVIDER=openai`, `LAB_MODEL=gpt-4o-mini`), so just fill in `OPENAI_API_KEY`.
To use Anthropic instead, see [Choosing a provider](#choosing-a-provider).

The `npm run …` lab scripts load `.env` automatically, so once your key is in
there you can run any lab.

> **Try it now:** the first labs need only your key — run `npm run m1` to confirm
> everything works.

### 4. Database setup (for the Vector search / RAG lab)

The RAG lab answers questions using **your own documents**. To do that it stores
each document — split into chunks plus a numeric "embedding" of each chunk — in a
**Postgres** database with the **pgvector** extension, then searches that database
for the chunks most relevant to a question. So you need a Postgres + pgvector
database running before that lab. The steps below start a throwaway one in Docker.

Start the database:

```bash
docker run -d \
  --name pgvector \
  -e POSTGRES_PASSWORD=pw \
  -p 5432:5432 \
  pgvector/pgvector:pg16
```

This matches the `DATABASE_URL` already in `.env.example`
(`postgres://postgres:pw@localhost:5432/postgres`). If you change the password or
port, update `DATABASE_URL` to match. Confirm it's up (give it a few seconds):

```bash
docker exec pgvector pg_isready -U postgres   # → "accepting connections"
```

Create the tables (the schema ships inside the package):

```bash
docker exec -i pgvector psql -U postgres -d postgres \
  < node_modules/@aifluens/agent-kit/schema.sql
```

Manage the container later:

```bash
docker stop pgvector     # stop (keeps your data)
docker start pgvector    # start it again
docker rm -f pgvector    # remove it entirely (deletes its data)
```

---

## Choosing a provider

Two settings control which model the labs use:

- **`LLM_PROVIDER`** — which provider to call: `anthropic`, `openai`, `google`,
  `bedrock`, `azure-openai`, or `vertex`. Set this explicitly.
- **`LAB_MODEL`** — which model id to use.

Set both in `.env`, plus that provider's key. No lab code changes:

| Provider | Set in `.env` | Key |
| --- | --- | --- |
| **OpenAI** (default) | `LLM_PROVIDER=openai` + `LAB_MODEL=gpt-4o-mini` | `OPENAI_API_KEY` |
| **Anthropic** | `LLM_PROVIDER=anthropic` + `LAB_MODEL=claude-sonnet` | `ANTHROPIC_API_KEY` |

The other providers (`google`, `bedrock`, …) work the same way — set
`LLM_PROVIDER`, the model, and the provider's standard key, then install its
`@langchain/*` package. See the
[`@aifluens/agent-kit` README](https://www.npmjs.com/package/@aifluens/agent-kit)
for the full list.

---

## Running the labs

The labs build on each other, so run them in order.

### LLM foundations — `labs/m1-llm-foundations/agent.ts`  _(key only)_

```bash
npm run m1
```

A plain agent on your chosen provider. Expect a brief, friendly billing-support
greeting.

### Tool use — `labs/m2-tool-use/agent.ts`  _(key only)_

```bash
npm run m2
```

The agent calls a `lookup_account` tool. Expect it to report **alice@acme.com is
on the Pro plan at $49**.

### Knowledge bases — `labs/m3-knowledge-bases/ingest.ts`  _(read + run)_

**Run it:** ingesting documents is done with `npm run ingest` (covered in full in
the next lab — it needs the [database](#4-database-setup-for-the-vector-search--rag-lab)):

```bash
npm run ingest   # chunks ./docs/*.md, embeds each chunk, stores them in pgvector (kb 1)
```

That command runs the real, packaged ingestion pipeline.

**Read it:** `labs/m3-knowledge-bases/ingest.ts` is an annotated, read-only view of
the *same* pipeline, so you can see the four steps — extract → chunk → embed →
store — laid out in code. It imports internal platform modules that aren't part of
`@aifluens/agent-kit`, so it isn't meant to be executed on its own (there's no
`npm run m3`); `npm run ingest` above is the runnable equivalent.

### Vector search / RAG — `labs/m4-vector-search-rag/retriever.ts`  _(key + database)_

First complete [Database setup](#4-database-setup-for-the-vector-search--rag-lab).
Then load documents into the database and run the lab.

**Ingest documents.** This chunks each file, computes embeddings, and stores them
in the database. The first run downloads a ~30 MB embedding model (cached after
that).

Load the sample docs that ship in this repo — `docs/billing.md`,
`docs/refunds.md`, and `docs/shipping.md` — into knowledge base 1:

```bash
npm run ingest          # = agent-kit-ingest ./docs/*.md --kb 1
```

To load **your own** documents instead, point the bin at your files (the
`npm run ingest` script loads `.env` for you; run the bin directly and you'll
need to export it yourself):

```bash
agent-kit-ingest ./path/to/your-docs/*.md --kb 1
```

**Run the lab:**

```bash
npm run m4
```

Expect an answer to "How long do refunds take?" grounded in `docs/refunds.md`
(5–7 business days) with `[1]`/`[2]` citations, plus a `searchType=vector, topK=3`
line.

### MCP & HTTP connections — `labs/m5-mcp-tools/agent-mcp.ts`, `agent-http.ts`  _(key + local server)_

This lab gives the agent tools that live on a separate server, using two
approaches: **MCP** (the Model Context Protocol, a standard way for agents to
discover and call a server's tools) and a plain **HTTP** API.

The **MCP client** that connects to such a server is part of the
`@aifluens/agent-kit` package. You bring the **server**. For this exercise the repo
includes a small local Help Desk server (`servers/helpdesk.mjs`, no dependencies)
that runs on your machine, and `AGENT_KIT_CONNECTIONS` in `.env.example` already
points the labs at it.

Run it in two terminals.

Terminal A — start the local server (MCP on :8000, HTTP on :8001):

```bash
npm run servers
```

Terminal B — run the labs:

```bash
npm run m5:mcp     # tools discovered over MCP, via MCPClient.connect("helpdesk-sandbox")
npm run m5:http    # the same tools called over plain HTTP, via callConnectionHttp("helpdesk-http")
```

Both should look up **ORD-1001**, issue a full refund, and confirm the new balance
of **$0**.

#### Bring your own MCP server

To use a different server, edit `AGENT_KIT_CONNECTIONS` in `.env` and skip
`npm run servers`. It's a JSON map of name → `{ kind, url, token? }`, where `kind`
is `"mcp"` (any server speaking MCP over Streamable HTTP) or `"http"` (any HTTP
API):

```json
{
  "helpdesk-sandbox": { "kind": "mcp",  "url": "https://your-mcp-server/mcp", "token": "…" },
  "helpdesk-http":    { "kind": "http", "url": "https://your-api",            "token": "…" }
}
```

### Agent-to-agent delegation — `labs/m9-agent-to-agent/agent.ts`  _(key only)_

```bash
npm run m9
```

A router agent hands the request to a `billing` specialist (which itself calls a
tool). Expect a billing-focused answer about the double charge.

> Observability, evals, and guardrails are covered on the hosted platform and
> aren't bundled in this repo.

---

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| `agent-kit: set LLM_PROVIDER to one of: …` | `LLM_PROVIDER` isn't set (or isn't valid). Set it in `.env` to `anthropic`, `openai`, `google`, `bedrock`, `azure-openai`, or `vertex`, and run via the `npm run …` scripts. |
| `agent-kit: set OPENAI_API_KEY …` / `set ANTHROPIC_API_KEY …` | Your key isn't in `.env`, or you ran a file directly instead of via `npm run …`. Put the key in `.env` and use the scripts — they load `.env` for you. |
| `401 Incorrect API key` / `invalid x-api-key` | The key for your `LLM_PROVIDER` is wrong — fix `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` in `.env` and re-run. |
| `agent-kit: set AGENT_KIT_CONNECTIONS …` | Set `AGENT_KIT_CONNECTIONS` in `.env` (it's pre-filled in `.env.example`) and run via `npm run m5:mcp` / `m5:http`. |
| `ECONNREFUSED localhost:8000/8001` | The local Help Desk server isn't running — start `npm run servers` in another terminal. |
| `ECONNREFUSED localhost:5432` | The pgvector container isn't up — re-run `docker run …` (or `docker start pgvector`). |
| `relation "labs_kb_chunks" does not exist` | The schema wasn't applied — run the `docker exec … psql … < node_modules/@aifluens/agent-kit/schema.sql` step. |
| The RAG lab's first run is slow | The ~30 MB embedding model downloads once and is cached; later runs are fast. |
| Port 8000 / 8001 / 5432 already in use | Stop whatever is using it, or change the port in `servers/helpdesk.mjs` / `.env`. |

---

> The `labs/` files are generated from the platform's canonical lab sources and
> kept in sync by a CI check, so this repo always matches what the course shows.
> Don't hand-edit `labs/` — change the lesson source.
