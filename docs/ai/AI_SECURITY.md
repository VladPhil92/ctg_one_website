# CTG One AI — Security Model

## Status

Architecture and policy definition. Controls must be implemented and tested per AI product before promotion to LIVE.

## Threats

- Prompt injection
- Data leakage
- Unauthorized retrieval
- Cross-business-unit data exposure
- Tool abuse
- Excessive agency
- PII exposure
- Hallucination presented as fact

## Control sequence

`identity -> authorization -> data scope -> policy -> model -> tool allowlist -> output validation -> human escalation -> audit`

## Rules

1. Authorization occurs before inference.
2. Prompts never substitute for access control.
3. Tools are deny-by-default and explicitly allowlisted.
4. Untrusted retrieved content must not override system policy.
5. High-risk actions require human authorization.
6. Secrets and provider keys remain server-side and never use `NEXT_PUBLIC_`.
7. Logs minimize PII while retaining enough metadata for investigation.
8. Cross-unit access is explicitly scoped, never implied by CTG One OS membership.

## Prompt injection posture

Treat external documents, user input, and retrieved text as untrusted data. Separate instructions from content, restrict tools, validate outputs, and escalate ambiguous high-impact requests.
