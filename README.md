# agent-kit-labs

Run the **AIFluensLab** learning labs on **your own machine**, with **your own
provider key** — no account, no telemetry, fully offline except the LLM API calls
you make.

This repo installs the public [`@aifluens/agent-kit`](https://www.npmjs.com/package/@aifluens/agent-kit)
package and runs the **real lab code**. The files under `labs/` are **identical**
to what the platform shows you, with one change: the model line reads
`model: MODEL` (env-driven) instead of the platform-authored `"claude-sonnet"`,
so you can pick any provider without editing lab code. That is the *same* BYOK
swap the platform applies — **what you see is what runs**.

> **Get this repo:** click **“Use this template”** on GitHub (or clone it). Then
> follow Setup below.

---

## Prerequisites

| Tool | Needed for | Notes |
| --- | --- | --- |
| **Node.js ≥ 20.11** | everything | the package requires it (`engines.node`) |
| **npm** | install | ships with Node |
| **An OpenAI _or_ Anthropic API key** | M1, M2, M9, M4 (live runs) | set `OPENAI_API_KEY` and/or `ANTHROPIC_API_KEY` — see [Choosing a provider](#choosing-a-provider) |
| **Docker** | M4 only | runs Postgres + pgvector |

No global installs are needed — `tsx` (the TypeScript runner) comes in as a dev
dependency and is invoked through the npm scripts.

## Project layout

```
agent-kit-labs/
├─ package.json          # installs the published package + peers; defines run scripts
├─ tsconfig.json         # editor convenience (tsx runs without it)
├─ .env.example          # copy to .env and fill in your key
├─ labs/                 # the real lab code, verbatim (only the model line differs)
│  ├─ _shared/model.ts                  # one provider/model switch for every lab
│  ├─ m1-llm-foundations/agent.ts
│  ├─ m2-tool-use/agent.ts
│  ├─ m3-knowledge-bases/ingest.ts      # display-only, not run (see below)
│  ├─ m4-vector-search-rag/retriever.ts
│  ├─ m5-mcp-tools/agent-mcp.ts
│  ├─ m5-mcp-tools/agent-http.ts
│  └─ m9-agent-to-agent/agent.ts
├─ docs/                 # sample knowledge-base docs ingested in M4
└─ servers/helpdesk.mjs  # local MCP (:8000) + HTTP (:8001) servers for M5 (no deps)
```

---

## Setup

```bash
npm install                 # pulls @aifluens/agent-kit + peers from the registry
cp .env.example .env        # then edit .env and paste your API key
```

Load the env vars into your shell **before running any lab** (re-run this in each
new terminal):

```bash
set -a; . ./.env; set +a
```

### Environment variables (`.env`)

| Variable | Used by | Default in `.env.example` |
| --- | --- | --- |
| `OPENAI_API_KEY` | live LLM runs on OpenAI | _(empty — you fill it in)_ |
| `ANTHROPIC_API_KEY` | live LLM runs on Anthropic | _(empty — you fill it in)_ |
| `LAB_MODEL` | which model/provider the labs use | `openai:gpt-4o-mini` |
| `DATABASE_URL` | M4 | `postgres://postgres:pw@localhost:5432/postgres` |
| `AGENT_KIT_KB_ID` | M4 | `1` |
| `AGENT_KIT_CONNECTIONS` | M5 | points at the local Help Desk servers |

> **Fastest first run:** M1, M2, M9 need only a provider key — no Docker, no
> servers. Set the key and run `npm run m1` to confirm everything works.

### Choosing a provider

The agent-kit picks the provider from the **prefix** of the model string and
reads that provider's own standard env var. You switch providers in one of two
ways — no lab code needs editing:

| Provider | Set in `.env` | Key |
| --- | --- | --- |
| **OpenAI** (default) | `LAB_MODEL=openai:gpt-4o-mini` | `OPENAI_API_KEY` |
| **Anthropic** | `LAB_MODEL=claude-sonnet` | `ANTHROPIC_API_KEY` |

- **Via the environment file** — set `LAB_MODEL` (and the matching key) in `.env`,
  reload (`set -a; . ./.env; set +a`), and run any lab.
- **Via code** — change the default literal in **`labs/_shared/model.ts`**, which
  every lab imports:
  ```ts
  export const MODEL = process.env.LAB_MODEL ?? "openai:gpt-4o-mini";
  //                                            ^ change this default to e.g. "claude-sonnet"
  ```

Friendly Anthropic shortnames resolve automatically (`claude-sonnet` →
`claude-sonnet-4-6`, `claude-opus` → `claude-opus-4-8`). Any provider the package
supports works the same way by prefix (`google:`, `bedrock:`, …) as long as you
set that provider's env var (and install its `@langchain/*` peer).

---

## Running the labs

### M1 · LLM foundations  _(key only)_
```bash
npm run m1
```
A plain agent on your chosen provider. Expect a brief, friendly billing-support
greeting.

### M2 · Tool use  _(key only)_
```bash
npm run m2
```
The agent calls the `lookup_account` tool. Expect it to report **alice@acme.com is
on the Pro plan at $49**.

### M9 · Agent-to-agent delegation  _(key only)_
```bash
npm run m9
```
A router agent delegates to a `billing` specialist (which itself calls a tool).
Expect a billing-focused answer about the double charge.

### M5 · MCP + HTTP connections  _(key + local server, two terminals)_
The labs talk to a Help Desk server **you supply** — included here as
`servers/helpdesk.mjs` (no dependencies). `AGENT_KIT_CONNECTIONS` in `.env`
already points at it.

Terminal A — start the servers (MCP on :8000, HTTP on :8001):
```bash
npm run servers
```
Terminal B — run the labs (load env first):
```bash
set -a; . ./.env; set +a
npm run m5:mcp     # tools discovered via MCPClient.connect("helpdesk-sandbox")
npm run m5:http    # same tools hand-wired via callConnectionHttp("helpdesk-http")
```
Both should look up **ORD-1001**, issue a full refund, and confirm the new
balance of **$0**.

### M4 · Vector search / RAG  _(key + Docker)_

M4 searches **your own** Postgres database with the
[`pgvector`](https://github.com/pgvector/pgvector) extension. The steps below
spin one up in a throwaway Docker container — no local Postgres install needed.

#### Step 1 — Start a Postgres + pgvector container

```bash
docker run -d \
  --name pgvector \
  -e POSTGRES_PASSWORD=pw \
  -p 5432:5432 \
  pgvector/pgvector:pg16
```

The matching connection string is already in `.env.example`:
`postgres://postgres:pw@localhost:5432/postgres`. If you change the password or
port above, update `DATABASE_URL` to match.

Confirm it's up (give it a couple of seconds to boot):

```bash
docker exec pgvector pg_isready -U postgres # → "accepting connections"
```

#### Step 2 — Apply the schema that ships inside the package

```bash
docker exec -i pgvector psql -U postgres -d postgres \
  < node_modules/@aifluens/agent-kit/schema.sql
```

#### Step 3 — Ingest the sample docs

First run downloads the ~30 MB Xenova embedding model (cached afterward):

```bash
set -a; . ./.env; set +a
npm run ingest          # = agent-kit-ingest ./docs/*.md --kb 1
```

#### Step 4 — Run the retrieval lab

```bash
npm run m4
```

Expect an answer to "How long do refunds take?" grounded in `docs/refunds.md`
(5–7 business days) with `[1]`/`[2]` citations, plus a `searchType=vector, topK=3`
line.

#### Managing the container

```bash
docker stop pgvector     # stop (keeps data)
docker start pgvector    # start it again later
docker rm -f pgvector    # remove the container entirely (deletes its data)
```

### M3 · Knowledge bases  _(display-only — not run)_
`labs/m3-knowledge-bases/ingest.ts` is the platform's internal ingestion pipeline,
shown read-only on the platform. It imports internal modules (`./chunking`,
`./db`) that are **not** part of `@aifluens/agent-kit`, so it does not run
standalone — the real local equivalent is the `agent-kit-ingest` CLI used in M4.
It's included verbatim only so this project mirrors every module.

> **M6 (observability), M7 (evals), and M8 (guardrails)** are platform-only or
> display-only and are not bundled here.

---

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| `401 Incorrect API key` / `invalid x-api-key` | The key for the provider in `LAB_MODEL` is missing/invalid — set `OPENAI_API_KEY` (openai models) or `ANTHROPIC_API_KEY` (claude models) in `.env`, then re-run `set -a; . ./.env; set +a`. |
| `agent-kit: set AGENT_KIT_CONNECTIONS …` (M5) | Env not loaded in this terminal — run the `set -a; . ./.env; set +a` line first. |
| `ECONNREFUSED localhost:8000/8001` (M5) | The Help Desk server isn't running — start `npm run servers` in another terminal. |
| `ECONNREFUSED localhost:5432` (M4) | The pgvector container isn't up — re-run the `docker run …` command (or `docker start pgvector`). |
| `relation "labs_kb_chunks" does not exist` (M4) | Schema not applied — run the `docker exec … psql … < node_modules/@aifluens/agent-kit/schema.sql` step. |
| M4 first run is slow | The Xenova embedding model (~30 MB) downloads once and is cached; later runs are fast. |
| Port 8000/8001/5432 already in use | Stop the process using it, or change the port in `servers/helpdesk.mjs` / `.env` accordingly. |

---

> The `labs/` files are generated from the platform's canonical lab sources and
> kept verbatim by a CI drift check, so this repo always matches what the course
> shows. Do not hand-edit `labs/` in the upstream repo — change the lesson source.
