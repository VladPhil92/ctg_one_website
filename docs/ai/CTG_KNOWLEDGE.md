# CTG Knowledge v0.1

## Product intent

CTG Knowledge is CTG One's first implemented RAG pilot. Its purpose is to answer questions over a curated, low-risk internal corpus with source-grounded responses and explicit authentication boundaries.

## Maturity

**PARTIAL / PILOT.** The repository now contains the application runtime, database migration, ingestion endpoint, authenticated query endpoint and user/admin interfaces. It must not be promoted to LIVE until migration `0007_ctg_knowledge_v01.sql` is applied in production, Render has a valid server-side `OPENAI_API_KEY`, a controlled corpus is ingested, and evaluation/operational verification is completed.

## Implemented v0.1 flow

`admin-curated text -> deterministic chunking -> OpenAI embeddings -> PostgreSQL/pgvector -> authenticated similarity RPC -> bounded retrieved context -> OpenAI Responses API -> answer + source metadata`

### Runtime surfaces

- `/knowledge` — authenticated query workspace.
- `/admin/knowledge` — admin-only ingestion workspace.
- `POST /api/knowledge/query` — authenticated retrieval and grounded answer endpoint.
- `POST /api/knowledge/admin/ingest` — admin-only ingestion endpoint.

## Security boundaries

- Authentication is required before retrieval.
- Admin authorization is required before ingestion.
- RLS remains authoritative for documents and chunks.
- The vector-search function is `SECURITY INVOKER`, so it operates under the caller's RLS context.
- Model/provider credentials are server-side only and must never use `NEXT_PUBLIC_`.
- `store: false` is sent to the OpenAI Responses API.
- Retrieved document text is treated as untrusted data and is explicitly prevented from overriding system instructions.
- v0.1 permits only `internal` low-risk material shared with authenticated CTG One users.
- Financial, KYC, personal, health, privileged legal or other restricted datasets are out of scope until a finer-grained authorization model exists.

## Retrieval contract

The query is embedded using the configured embedding model (default `text-embedding-3-small`). PostgreSQL/pgvector calculates cosine similarity through `match_knowledge_chunks()`. v0.1 requests up to six chunks above a configurable-in-code similarity threshold of `0.55`.

If no authorized chunk clears the threshold, the application returns an explicit insufficient-evidence response without asking the generation model to improvise.

## Citation-First behavior

Retrieved chunks are numbered before generation. The model is instructed to cite factual statements using `[1]`, `[2]`, etc. The API independently returns structured source metadata so the interface can show document title, business unit, source URI, chunk index and similarity.

This is a v0.1 citation contract, not yet a full citation-correctness verifier. Citation correctness remains part of the evaluation gate before LIVE.

## Ingestion constraints

v0.1 intentionally accepts curated text rather than arbitrary PDFs/files. This avoids introducing an unreviewed parser/OCR attack surface while the retrieval and authorization model is being validated.

- Maximum raw content: 120,000 characters.
- Maximum generated chunks: 64 per ingestion request.
- Duplicate document bodies are rejected using SHA-256 content hashes.
- Failed chunk persistence attempts delete the newly created parent document to avoid incomplete corpus entries.

## Required production configuration

Render server environment:

- `OPENAI_API_KEY` — secret, server-side only.
- `OPENAI_EMBEDDING_MODEL=text-embedding-3-small`
- `OPENAI_RESPONSE_MODEL=gpt-5-mini`
- existing Supabase environment variables.

Database:

- apply `supabase/migrations/0007_ctg_knowledge_v01.sql`.
- verify the `vector` extension is enabled.

## LIVE gate

CTG Knowledge may move from PARTIAL/PILOT to LIVE only after:

1. production migration and environment configuration are verified;
2. a bounded approved corpus is ingested;
3. a representative evaluation dataset exists;
4. groundedness, retrieval quality and citation correctness meet documented thresholds;
5. authorization tests demonstrate signed-out and non-admin failure paths;
6. latency and cost are measured on realistic traffic;
7. failure/no-evidence behavior is verified;
8. an accountable operational owner is named;
9. production logs are reviewed to ensure PII is not being indiscriminately retained.

## Next version

v0.2 should add document lifecycle management, business-unit/role-specific permissions, citation validation, evaluation fixtures, feedback capture and optional controlled file parsing only after its security model is reviewed.
