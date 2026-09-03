# JP Valderrama main provenance recovery — 2026-09-02

PR #381 restored the JP Valderrama production image-delivery path and passed its complete pre-merge CI matrix. It was then squash-merged, producing a valid one-parent application commit but an invalid transport for the repository-wide `Investment BR Merged-Main Provenance` contract, which intentionally requires a GitHub-verified two-parent merge transition on `main`.

This recovery change modifies no application code, database schema, investment business rules, wallet authority, authentication, image payload, deployment configuration, or runtime behavior.

## Required merge method

Merge this recovery PR using GitHub's regular **Create a merge commit** method. Do not squash or rebase it.

The expected result is a new two-parent `main` transition whose first parent is the current `main` SHA and whose second parent is this reviewed PR head, restoring the existing provenance gate without weakening it.