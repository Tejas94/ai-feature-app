# Roadmap: from learning project to production

The project grows in three stages. Stage 1 is the weeks 1-3 build. Stage 2 is week 10 of
the plan. Stage 3 is for after week 12, when you want it to be a product rather than a
portfolio piece. Pick from stage 3; you do not need all of it.

## Stage 1: working feature (weeks 1-3)

- [ ] All eight TODOs done (`npm run progress` shows 8 of 8)
- [ ] 20 real products in `evals/cases`, results per model and a calibration line in the README
- [ ] Rate limiting on the model routes and a spend limit in the Anthropic Console
- [ ] Deployed on a host with a persistent disk, with a demo GIF

## Stage 2: production-ready (week 10)

| Item | Why it matters |
| --- | --- |
| Postgres for entries and corrections, object storage (S3, R2 or Vercel Blob) for photos, behind the existing `CatalogStore` interface | Runs on any host, survives redeploys, and lets you query the correction log |
| Auth, plus per-user rate limits and a daily spend cap checked before each model call | A public demo with your API key is an open wallet |
| Prompt caching on the system prompt and schema (`cache_control`), measured with `usage.cache_read_input_tokens` | The prefix is identical on every call; caching cuts its input cost and latency |
| Timeouts and retries for 429 and 529 errors, with a clear message when they run out | Model calls fail in ways a normal API does not; users should never see a blank form |
| Background jobs for drafts: return a job id, poll or stream the result | A six-photo draft with thinking can take a while; requests should not hang on it |
| The Message Batches API for bulk imports | Half the price of live calls when nobody is waiting for the answer |
| A log of cost, latency, retries and correction rate per request, with a dashboard | Turns "it is cheap and accurate" into numbers you can quote |
| Strip EXIF on the server too, not only in the browser | Another client (or a curl) can still upload a photo with GPS data |
| Injection cases: labels and packaging with instructions printed on them | Text in a photo is third-party input; it belongs in `visibleText`, never in your behaviour |
| Opt-in eval job in CI (`ANTHROPIC_API_KEY` secret, `EVAL_MIN_SCORE`) | A prompt or schema change that breaks extraction fails the PR |

## Stage 3: scale (after week 12)

| Item | What you learn |
| --- | --- |
| A React Native (Expo) camera app on the same API | Your mobile background, now with AI: offline queues, upload on bad networks, on-device resizing |
| Visual duplicate detection with image embeddings or perceptual hashes next to the text rules | When text matching is not enough, and how to combine two signals |
| Semantic catalogue search with embeddings (reuse what you build in rag-assistant) | Hybrid search over structured data |
| Marketplace export: Shopify or eBay CSV and product feeds | Mapping your schema onto someone else's, and validating it before upload |
| A bulk import queue for a shelf of products at a time | Throughput, backpressure and cost control |
| An active-learning loop: route low-confidence drafts to review first and turn corrections into eval cases and few-shot examples | Using production data to improve the system on purpose |
| Distillation to a cheaper model, measured on the eval set | When a smaller model with the right data beats a bigger one on cost |
| Multi-tenant catalogues with per-tenant taxonomies | Data isolation, and prompts that change per customer |

## Before you share the repo

- [ ] Real products in `evals/cases`, with no people, addresses or screens in the photos and
      no EXIF location data
- [ ] Live demo link, demo GIF and a filled-in "Evals and results" table
- [ ] No secrets in the history (`git log -p | grep -i "sk-ant"` returns nothing)
- [ ] `npm run progress` shows every TODO done; `tests/specs` is empty
- [ ] Decide whether `docs/LEARNING_PATH.md` and the tutor-mode `CLAUDE.md` stay public
- [ ] Pin the repo on your GitHub profile
