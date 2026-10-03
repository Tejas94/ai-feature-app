# Experiment log

One row per change you measure. Change one thing at a time, run the eval before and after,
and write down what happened, including the experiments that made things worse. This log
is where your README results and your interview stories come from.

Before P1-07 is done, the eval prints drafts next to the gold labels without scores. Count
what was wrong by hand in the Notes column until then.

| Date | Change | Model | Cases | Overall | Identifiers | Tags F1 | Retries | Cost per entry | p50 latency | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| | Baseline: short extraction prompt | claude-opus-5-5 | 4 synthetic | | | | | | | |

## Experiments worth running

- [ ] Image size: 800 px versus 1568 px on the long edge (tokens, cost, what the model misses)
- [ ] `effort: "low"` versus the default for the first look (time to first token, output tokens)
- [ ] Short prompt versus a prompt that covers every point in the P1-03 comment
- [ ] Structured outputs (`messages.parse`) versus prompt-only JSON: failure count and types
- [ ] One photo versus all angles (`npm run eval -- --max-photos 1`)
- [ ] Tweaking `.describe()` text in `schema.ts` instead of the system prompt
- [ ] `visibleText` as the first field versus the last
- [ ] Taxonomy descriptions pasted into the prompt versus category ids alone
- [ ] Opus versus Sonnet versus Haiku on the full eval set: accuracy, cost per entry, latency
- [ ] Duplicate threshold: 0.5 versus 0.6 versus 0.7 on the near-duplicate pairs
- [ ] Model confidence versus `reviewFlags()` confidence in the calibration table

## Image tokens (week 1)

| Photos | Size | Estimated tokens | `input_tokens` reported | Notes |
| --- | --- | --- | --- | --- |
| 1 | 1568 x 1176 | | | |

## Time to first token (week 1)

| Model | Effort | Photos | First text | Total | Output tokens |
| --- | --- | --- | --- | --- | --- |
| claude-opus-5-5 | default | | | | |

## Calibration (week 3)

From the calibration table in `evals/report.md`.

| Date | Model | Source | Fields ≥ 0.7 accuracy | Fields < 0.7 accuracy | Notes |
| --- | --- | --- | --- | --- | --- |
| | | Model's own confidence | | | |
| | | After `reviewFlags()` | | | |

## Correction rates from real use (week 3 onward)

From `/stats`. Compare them with the eval: a field people fix often but the eval scores
high means the gold labels or the metric miss something.

| Date | Saved entries | Most corrected field | Rate | What you changed because of it |
| --- | --- | --- | --- | --- |
| | | | | |
