# CTG One AI — Agent Runtime

## Status

ROADMAP. This document defines the target runtime; it does not claim a production agent system exists today.

## Definition

An agent is not treated as a chatbot. The target composition is:

`model + context + tools + controlled memory + permissions + policy + evaluation + audit`

## Request flow

`user/event -> identity -> authorization -> data scope -> policy -> context -> model -> allowed tools -> validation -> human escalation when required -> action -> audit`

Authorization must be resolved before model inference. Prompts are not an authorization boundary.

## Required agent contract

Every production agent must declare:

- stable identity and purpose;
- business-unit scope;
- allowed data sources;
- allowed tools and denied tools;
- role and permission requirements;
- human escalation conditions;
- evaluation suite;
- observability fields;
- failure and fallback behavior.

## Financial boundary

No AI agent may autonomously approve withdrawals, execute payments, alter financial ledgers, create settlements, approve investments, or modify balances. Financial AI remains analysis/assistance unless a separately reviewed architecture introduces explicit authorization and human controls.

## Promotion to LIVE

An agent can move to LIVE only when production code, authorization controls, scoped tools, evaluation, monitoring, cost measurement, fallback behavior, and accountable human ownership are all verifiable.
