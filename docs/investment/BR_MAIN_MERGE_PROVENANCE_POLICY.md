# Investment BR main-merge provenance policy

## Purpose

`Investment BR Merged-Main Provenance` treats the Git history of `main` as part of its security boundary. A trusted provenance transition must be a GitHub-verified, non-forced, two-parent merge commit associated with exactly one merged pull request targeting the exact previous `main` SHA.

This requirement is intentionally stricter than ordinary repository history. It exists so a governance artifact can bind all of the following facts without replay ambiguity:

- the exact previous `main` SHA;
- the exact reviewed pull-request head SHA;
- the exact GitHub merge commit;
- the immutable business-rule candidate blob; and
- the governance blob present at the resulting `main` commit.

## Required merge method

Changes entering `main` while this provenance workflow is enabled must use **Create a merge commit**. Do not squash-merge or rebase-merge these pull requests.

A squash merge has only the previous `main` commit as its parent and therefore cannot satisfy the second-parent binding to the reviewed pull-request head. Re-running the workflow cannot repair that historical fact.

## Pre-merge operator checkpoint

Before merging any pull request into `main`:

1. Confirm the selected GitHub merge method is **Create a merge commit**.
2. Confirm the pull request head SHA is still the reviewed and CI-tested SHA.
3. Do not use squash/rebase merely because the pull request is small, documentation-only, wallet-only, or unrelated to Investment.
4. After merge, require `Investment BR Merged-Main Provenance` to be green on the resulting `main` SHA before treating `checksPass` deployment automation as trustworthy.

This checkpoint is repository-wide. PR #315 demonstrated that a valid application change can still produce an invalid governance transition when merged as a one-parent commit; the application fix remains intact, but the historical transition cannot be retroactively made provenance-eligible.

## Recovery after an invalid main transition

If a squash/rebase transition reaches `main` and the provenance workflow fails:

1. Do not force-push or rewrite `main`.
2. Do not weaken the provenance workflow to accept the invalid historical transition.
3. Open a normal recovery pull request from the current `main` tip with a reviewed, non-empty change.
4. Validate the recovery PR through normal CI.
5. Merge it explicitly with **Create a merge commit** so the resulting commit has exactly two parents: the prior `main` SHA and the reviewed recovery PR head SHA.
6. Confirm `Investment BR Merged-Main Provenance` succeeds on the new `main` SHA before relying on `checksPass` deployment automation.

The failed historical run remains valid evidence that the prior transition was not provenance-eligible; the recovery transition does not rewrite or falsely approve it.

## Operational note

This policy applies repository-wide because the provenance workflow runs on every push to `main`. Unrelated wallet, Nvet, AI, website, or operations changes can therefore block `checksPass` deployment when merged with a one-parent strategy. The safe operational default is to use merge commits consistently for all pull requests targeting `main`.
