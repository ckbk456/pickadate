# Pick-a-Date Agent Instructions

## Operating contract

- Communicate with Khang Cao in English and lead with outcomes and evidence.
- Be constructively critical. Flag unnecessary infrastructure, unsafe shortcuts,
  weak abstractions, inaccessible interactions, and requirements that cannot be
  tested before implementing them.
- Classify the prompt before acting: answer/review/diagnose/research/plan are
  read-only by default; implementation authorizes bounded repository changes;
  merge, production deployment, live email, provider spend, and destructive
  external actions require explicit authority.
- Distinguish investigated, implemented, locally validated, CI green, manual QA,
  merged, deployed, released, and production verified.
- Preserve unrelated user and agent work. Never reset, stash, overwrite, clean,
  or absorb unknown changes.

## Repository and architecture

- Integration branch: `master`.
- Implementation branches: `codex/<short-kebab-case-task>`.
- Runtime: Node.js 24.17.0 from `.nvmrc`.
- Package manager: npm; `package-lock.json` is authoritative.
- Framework: Next.js 16 App Router with React 19 and JavaScript.
- Application source: `src/app/`.
- CI: `.github/workflows/ci.yml`.
- There is currently no database, authentication, email provider, place-data
  provider, deployment target, migration system, code generator, or automated
  test suite. Do not invent or imply one.

## Before changing files

1. Read this file, `docs/README.md`, the owning `docs/logic/` document, relevant
   roadmap/research material, and the owning manual guide.
2. Inspect `git status --short --branch`, remotes, sync state, registered
   worktrees, and relevant running processes/listeners.
3. Fetch the remote and create an isolated worktree from the latest
   `origin/master`. Never implement directly on the integration checkout.
4. Confirm the requested scope and external side effects. Do not silently turn
   research, planning, diagnosis, or review into implementation.

## Command registry

| Purpose | Command | Source of truth | Expected duration | CPU-intensive |
| --- | --- | --- | --- | --- |
| Install | `npm ci` | `package-lock.json` | 1-3 minutes | No |
| Development server | `npm run dev` | `package.json` | Long-running | Yes |
| Lint | `npm run lint` | `package.json` | Under 1 minute | No |
| Production build | `npm run build` | `package.json` | 1-3 minutes | Yes |
| Full PR gate | `npm run check` | `package.json` and CI | 2-4 minutes | Yes |

- Run at most one CPU-intensive command per worktree at a time.
- Before starting a build, test, generator, migration, or dev server, inspect for
  an equivalent owned process and reuse or wait for it.
- Keep and poll the original process session. Do not retry merely because output
  is quiet. Build/typecheck investigation threshold: 15 minutes.
- Do not use watch mode unless explicitly requested. `npm run dev` is allowed
  only when the task needs a development server and must be tracked until stopped.
- An agent may terminate only the exact process tree it started.

## Product and documentation contracts

- `docs/logic/` owns current behavior and invariants.
- `docs/roadmap/` owns proposed or sequenced work and never overrides current
  behavior.
- `docs/research/` owns evidence and recommendations, not decisions.
- `docs/archived/` is historical and never authoritative.
- `testing/MANUAL TO-DO/` owns active human verification by durable domain.
- `testing/artifacts/` stores only sanitized evidence.
- Update the owning logic document and manual guide in the same PR as a behavior
  change. Record unrun scenarios as pending; never imply they passed.
- `docs/roadmap/product-brief.md` is protected foundational product direction.
  Do not expand or change its user flow, actors, provider assumptions, or privacy
  boundary without consulting Khang.

## Validation and manual gates

- During implementation, run the smallest deterministic check that can disprove
  the change. Before PR-ready status, run `npm run check` once on the final tree.
- No automated tests exist yet. Add a test framework only when a real behavior
  justifies it and include the command in this registry and CI in the same PR.
- Human testing owns real email/provider behavior, cross-account lifecycle,
  accessibility judgment, responsive/visual fidelity, and real-device behavior.
- Automated validation does not prove provider delivery, production release, or
  human acceptance.

## Browser, providers, and environments

- Prefer source inspection and deterministic commands. Use browser or Computer
  Use testing only when Khang explicitly requests a specific UI check.
- Before UI interaction, identify the task worktree, owned server, port,
  environment, page, account, and possible external side effects.
- Never print or commit passwords, cookies, tokens, private URLs, raw email
  links, provider payloads, or personal data.
- Name environments precisely: local, development, preview, staging, or
  production. No deployment environment is configured today.
- Sending real email, creating paid provider resources, changing access, or
  deploying to production always requires explicit current authorization.

## Pull requests, merge, and task names

- Keep one deployable concern per branch and open a scoped draft PR into
  `master` unless Khang explicitly says no PR.
- A PR handoff must name the branch, worktree, commit, integration baseline,
  files changed, validation run, docs/manual guides updated, risks, exclusions,
  processes, environments, and remaining human/provider gates.
- Do not merge, deploy, migrate production data, or send external messages
  without explicit authorization.
- Before a merge checkpoint, verify exact PR head SHAs, CI, review state,
  dependencies, mergeability, combined validation, worktrees, and processes.
- Before a PR exists, use a short descriptive task title. After GitHub returns a
  real PR number, rename it exactly `PR #<number>: <final PR title>`; never guess.
