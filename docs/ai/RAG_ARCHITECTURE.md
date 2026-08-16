# CTG One AI — RAG Architecture

## Status

IN DEVELOPMENT. The architecture is defined; a production retrieval pipeline is not yet claimed.

## Principle

CTG One Knowledge follows **Citation-First AI**: for factual internal knowledge, a source-grounded answer is preferred over an unsupported fluent answer.

## Target pipeline

`authorized documents -> parsing -> chunking -> metadata -> embeddings -> vector index -> retrieval -> ranking -> bounded context -> model -> answer -> citations`

Documents remain in controlled sources. Retrieval supplies relevant context at query time; the model does not receive unrestricted access to the full knowledge estate.

## Security boundaries

Retrieval must enforce user identity, role, organization/business-unit scope, document permissions, and data classification before context is assembled. RLS and server-side authorization remain authoritative; model instructions are not access control.

## Citation contract

A factual answer should retain enough provenance to identify the supporting source, section/chunk, and document version. Citation correctness is part of evaluation, not merely UI decoration.

## Promotion to LIVE

Requires a real ingestion pipeline, a controlled vector store/index, permission-aware retrieval, reproducible evaluation, source citations, monitoring, and an operational owner.
