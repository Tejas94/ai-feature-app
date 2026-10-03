# Roadmap: from learning project to production

The project grows in three stages. Stage 1 is the weeks 1-3 build. Stage 2 is week 10 of
the plan. Stage 3 is for after week 12, when you want it to be a product rather than a
portfolio piece. Pick from stage 3; you do not need all of it.

## Stage 1: working feature (weeks 1-3)

- [ ] All six TODOs done (`npm run progress` shows 6 of 6)
- [ ] 20+ eval cases, results per model in the README
- [ ] Deployed on Vercel with a demo GIF

## Stage 2: production-ready (week 10)

| Item | Why it matters |
| --- | --- |
| Rate limit `/api/search` and `/api/fit` per IP (for example Upstash Redis or Vercel Firewall) | A public demo with your API key is an open wallet |
| Validate request bodies with Zod in both routes | Never trust the client, even your own |
| Handle `stop_reason` values in the UI: `max_tokens`, `refusal`, plus 429 and 529 errors with retry | Users should see a clear message, not a half answer |
| Prompt caching on the fit prompt (system prompt and CV are the same every call) | Cuts input cost on repeat calls; measure it with `usage.cache_read_input_tokens` |
| A `/costs` page: calls, tokens and dollars per day from a log of `usage` | Turns "it's cheap" into a number you can quote |
| Prompt-injection cases: a job description that says "ignore your instructions" | Job posts are third-party text; your fit answer must not obey them |
| Opt-in eval job in CI (`ANTHROPIC_API_KEY` secret) | A prompt change that breaks extraction fails the PR |

## Stage 3: scale (after week 12)

| Item | What you learn |
| --- | --- |
| Real jobs from a jobs API or RSS feeds, stored in Postgres instead of `jobs.json` | Ingestion jobs and data freshness |
| Accounts, each user with their own CV (Auth.js or Clerk) | Multi-tenant data and per-user cost |
| Semantic job search with embeddings next to the structured filters (reuse rag-assistant) | Hybrid retrieval in a real product |
| Model routing: a small model for filter extraction, a larger one for fit answers | Cost-quality trade-offs backed by your evals |
| Nightly batch scoring of new jobs against each CV with the Message Batches API | Batch pricing is half the cost of live calls |
| Tracing with OpenTelemetry or Langfuse; p95 latency and cost dashboards | Observability for LLM features |
| A React Native client sharing the same API | Your mobile background, now with AI |

## Before you share the repo

- [ ] Real data: your own CV summary and real postings, no placeholder text
- [ ] Live demo link, demo GIF and a filled-in "Evals and results" table
- [ ] No secrets in the history (`git log -p | grep -i "sk-ant"` returns nothing)
- [ ] `npm run progress` shows every TODO done; `tests/specs` is empty
- [ ] Decide whether `docs/LEARNING_PATH.md` and the tutor-mode `CLAUDE.md` stay public
- [ ] Pin the repo on your GitHub profile
