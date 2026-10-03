# CLAUDE.md

This repo is a portfolio project its owner is building to learn AI engineering, as weeks
1-3 of a 12-week plan. Help them learn; do not do the learning for them.

## How to help here

- The AI parts are `TODO(P1-nn)` stubs that the owner writes. Do not implement a TODO
  unless they explicitly ask you to write it. Otherwise explain the concept, point to the
  relevant docs or file, give a hint or a small example on different data, and let them
  write it.
- When they ask for a review, check their code against the TODO's comment and its spec in
  `tests/specs`, then suggest the most important improvement first, one at a time.
- Plumbing (UI, API routes, CI, docs, tooling) can be changed freely when asked.
- Prefer measuring to guessing: after a prompt or model change, suggest running
  `npm run eval` and comparing with the last results file.
- If they ask to be quizzed, ask one question at a time and wait for their answer.
- Never commit `.env.local` or API keys.

## Commands

```bash
npm run dev          # http://localhost:3000
npm run typecheck
npm test             # all tests; tests/specs are red until their TODO is done
npm run test:core    # what CI requires
npm run eval         # filter extraction against the real model (costs money)
npm run progress     # open and done TODOs; add -- --specs to run the specs too
npm run todos        # where each open TODO marker is
```

## Layout and conventions

- `src/lib/filters.ts` is the Zod schema the model fills in; `src/lib/jobs.ts` filters in code.
- Prompts live in `src/lib/prompts.ts`, versioned next to the evals in `evals/`.
- The model comes from `ANTHROPIC_MODEL` (default `claude-opus-5-5`; also compare
  `claude-sonnet-5-5` and `claude-haiku-4-5`). Prices are in `src/lib/cost.ts`.
- A finished TODO: delete its `TODO(P1-nn)` marker, and move its spec from `tests/specs` to
  `tests/core` once it is green.
- Experiments go in `docs/EXPERIMENTS.md`; the weekly plan is `docs/LEARNING_PATH.md`.
