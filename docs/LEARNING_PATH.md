# Learning path: weeks 1-3

This project is the build half of weeks 1-3 of the 12-week plan. Each week, read that week's
lesson in the study pack (in the `study-pack` folder of your Claude project), then come
here and build. Aim for about 11 hours of building a week.

Every week ends the same way: run the checks, log what you learned in
[EXPERIMENTS.md](EXPERIMENTS.md), commit, and push. Small commits with clear messages are
part of the portfolio: recruiters do read the history.

```bash
npm run typecheck && npm test   # specs for open TODOs are expected to be red
npm run progress                # what is left
```

## Week 1: how LLMs work

**Read:** study pack, week 1 "How LLMs work".

**Build:** P1-01, `streamText()` in `src/lib/llm.ts`.

1. Call `anthropic.messages.stream()` and yield the text of each `text_delta`.
2. Log every event type once and read them: `message_start`, `content_block_start`,
   `content_block_delta`, `message_delta`, `message_stop`. Current models also stream
   `thinking` blocks before the answer; notice them and skip them.
3. Return the usage from `stream.finalMessage()`. You will need it for P1-05.

**Try on purpose:**

- Set `max_tokens` to 50 and watch the answer stop mid-sentence with `stop_reason: "max_tokens"`.
  Decide what the UI should show when that happens.
- Time the first chunk and the whole answer. Time to first token is what users feel.

**Done when:** "Explain my fit" streams into the UI (the answer is odd until P1-04; that is fine).

**Interview angle:** "Why stream, and what can go wrong mid-stream?"

## Week 2: prompting and structured output

**Read:** study pack, week 2 "Prompting and structured output".

**Build:** P1-02 (filter prompt) and P1-03 (`extractFilters()`).

1. Write a one-sentence system prompt, finish P1-03 with `messages.parse()` and
   `zodOutputFormat`, and run `npm run eval`. Write the baseline score in EXPERIMENTS.md.
2. Improve the prompt one idea at a time (context, ambiguity rules, few-shot examples) and
   re-run the eval after each. Keep the changes that move the score; revert the others.
3. Build the prompt-only JSON version from step 3 of the P1-03 comment and compare how
   each one fails.

**Try on purpose:** queries that should produce no filters ("show me something fun"),
typos ("Reakt"), currencies ("€70k"), contradictions ("junior staff engineer").

**Done when:** all 5 starter eval cases pass, and EXPERIMENTS.md has at least three rows.

**Interview angle:** "How do you get reliable JSON out of an LLM, and what do you do when
validation still fails?"

## Week 3: ship it

**Read:** study pack, week 3 "Ship it".

**Build:** P1-04 (fit prompt), P1-05 (`costUsd()`), P1-06 (20+ eval cases), then deploy.

1. P1-04: decide the answer format (score, strengths, gaps, one talking point) and keep it
   short through the prompt.
2. P1-05: make `tests/specs/cost.test.ts` green, then move it to `tests/core`.
3. P1-06: write cases from queries you would really type, plus every bug you found in the UI.
4. Run the eval on `claude-opus-5-5`, `claude-sonnet-5-5` and `claude-haiku-4-5` (set
   `ANTHROPIC_MODEL`). Fill in the "Evals and results" table in the README: the cheapest
   model that still passes is often the right default.
5. Deploy to Vercel, record a demo GIF, write the "Ship it" items in the README.

**Done when:** `npm run progress` shows 6 of 6, the README has a live link and filled-in
results, and you have posted about it.

**Interview angle:** "Walk me through a feature you shipped with an LLM: how did you know
it worked, and what did it cost per request?"

## Later weeks that come back here

- **Week 9 (evals as a discipline):** add an opt-in CI job that runs `npm run eval` on pull
  requests, like the one in the mcp-agent repo.
- **Week 10 (production concerns):** stage 2 of the [roadmap](ROADMAP.md): rate limits,
  prompt caching, a cost dashboard and prompt-injection tests.
- **Week 12 (interview-ready):** rehearse a 5-minute walkthrough: problem, architecture
  diagram, eval results, cost, what you would do next.
