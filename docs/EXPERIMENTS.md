# Experiment log

One row per change you measure. Change one thing at a time, run the eval before and after,
and write down what happened, including the experiments that made things worse. This log
is where your README results and your interview stories come from.

| Date | Change | Model | Eval before → after | Cost per query | Notes |
| --- | --- | --- | --- | --- | --- |
| | Baseline: one-sentence filter prompt | claude-opus-5-5 | – → ?/5 | | |

## Experiments worth running

- [ ] One-sentence prompt vs. prompt with context and ambiguity rules
- [ ] Few-shot examples: none vs. 2 vs. 5 (does it start copying them?)
- [ ] Structured output (`messages.parse`) vs. prompt-only JSON: failure count and failure types
- [ ] Tweaking `.describe()` text in `filters.ts` instead of the system prompt
- [ ] Opus vs. Sonnet vs. Haiku on the full eval set: pass rate, cost and latency
- [ ] Fit answer length: no limit vs. "under 120 words" (cost and how useful it reads)
