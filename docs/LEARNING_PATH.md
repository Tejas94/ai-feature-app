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

**Build:** P1-01 (`streamFirstLook()` in `src/lib/llm.ts`) and P1-02 (`costUsd()` in
`src/lib/cost.ts`).

1. Run `npm run dev`, add two photos of anything with a label and press **First look**. You
   get "Not implemented yet: P1-01". That message is how every gap in this repo shows up.
2. P1-01: send the image blocks and `FIRST_LOOK_PROMPT` with `anthropic.messages.stream()`,
   yield the text of each `text_delta`, and return the usage and stop reason from
   `stream.finalMessage()`. The route and the UI around it are done.
3. Log every event type once and read them in order: `message_start`,
   `content_block_start`, `content_block_delta`, `message_delta`, `message_stop`. Current
   models think before they answer, so a `thinking` block arrives before the text. Notice how
   long it takes before the first word.
4. P1-02: make `tests/specs/cost.test.ts` green, then move it to `tests/core`. The first
   look footer now shows the cost of each call.
5. Open the app on your phone (`npm run dev -- -H 0.0.0.0`) and use **Take photo**. The
   camera and the downscaling are already wired up.

**Try on purpose:**

- Image tokens: the page shows an estimate (width × height / 750) next to the photos.
  Send 1, 3 and 6 photos and compare with `input_tokens`. Then change `maxEdge` in
  `src/lib/client/downscale.ts` to 800 and see what the first look misses.
- Set `max_tokens` to 300 and watch `stop_reason` turn into `"max_tokens"`. Thinking tokens
  count toward the limit, so the answer may not even start. The UI shows a warning; decide
  whether it says the right thing.
- Time to first token: the footer shows it next to the total time. Try `effort: "low"` and
  then `ANTHROPIC_MODEL=claude-haiku-4-5`, and put the numbers in EXPERIMENTS.md.
- Photograph something with no brand on it. Does the first look name one anyway?

**Stretch, from the study pack:** put a second provider behind one interface such as
`stream(images): AsyncIterable<string>` and compare where the images go, how the text comes
back and what the usage fields are called.

**Done when:** a first look streams into the UI on your phone with its cost, time to first
token and total time, and `cost.test.ts` lives in `tests/core`.

**Interview angle:** "How does a photo become tokens, what did one product cost you, and
why stream?"

## Week 2: prompting and structured output

**Read:** study pack, week 2 "Prompting and structured output".

**Build:** P1-03 (`EXTRACTION_SYSTEM_PROMPT`), P1-04 (`extractDraft()`) and P1-05
(`findDuplicates()`).

1. P1-03, first pass: replace the placeholder with three or four sentences. Do not polish it
   yet; you need a baseline to measure against.
2. P1-04: `messages.parse()` with `zodOutputFormat(CatalogDraft)`, images first, then a short
   text instruction, and one retry that tells the model what went wrong. **Create entry**
   now fills the review form.
3. Run `npm run eval -- --check`, then `npm run eval`. Scoring is a week 3 TODO, so for now
   the runner prints each draft next to its gold label and you judge by eye. Write the
   baseline in EXPERIMENTS.md: what was wrong, retries, cost per entry.
4. Improve the prompt one idea at a time (the comment on P1-03 lists what a good one
   covers), re-running the eval after each. Keep what helps, revert what does not. Editing
   the `.describe()` text in `src/lib/schema.ts` counts as a prompt change too.
5. P1-05: make `tests/specs/duplicates.test.ts` green and move it to `tests/core`. Then
   upload `evals/cases/kelvaro-travel-mug/1.jpg` and `2.jpg` in the app and press
   **Create entry**: the seed catalogue holds two similar mugs, and the warning card should
   list both.
6. The study pack's milestone asks for a `fixtures/` folder of 10 inputs. The eval cases are
   that folder. Start adding real products now (see P1-08); week 3 needs 20.

**Try on purpose:**

- Prompt-only JSON versus structured outputs: build the second version described in the
  P1-04 comment and run the eval on both. Count the failures and their types.
- One photo versus all angles: `npm run eval -- --max-photos 1`. The barcodes are on the
  back of the starter boxes, so watch the identifiers.
- A photo with glare over the barcode, or a covered digit. Does the model guess the digit?
- Move `visibleText` from the first field of `CatalogDraft` to the last and re-run the eval.

**Stretch, from the study pack:** add one worked example to the prompt (few-shot, text only)
and measure whether it helps or whether the model starts copying it.

**Done when:** `npm run eval` extracts every case without a failure, EXPERIMENTS.md has a
baseline and at least two measured prompt changes, and `duplicates.test.ts` lives in
`tests/core`.

**Interview angle:** "How do you get reliable structured data out of a vision model, and
what do you do when validation still fails?"

## Week 3: ship it

**Read:** study pack, week 3 "Ship it".

**Build:** P1-06 (`reviewFlags()`), P1-07 (`scoreEntry()`) and P1-08 (20 real eval cases),
then deploy.

1. P1-06: make `tests/specs/confidence.test.ts` green. Check the GS1 check digit by hand on
   one barcode from your kitchen first. The review form now highlights flagged fields with
   their reasons.
2. P1-07: make `tests/specs/score.test.ts` green. `npm run eval` now prints scores per field,
   the calibration table and only the fields that lost points.
3. P1-08: photograph 20 real products through the app, correct and save each one, and run
   `npm run eval:import-corrections -- --all`. The checklist and the label rules are in
   `evals/cases/README.md`. Read every label before you commit it.
4. Run the eval on `claude-opus-5-5`, `claude-sonnet-5-5` and `claude-haiku-4-5`
   (`--model`). Fill in the README table and the calibration line. The cheapest model that
   still meets your bar is often the right default.
5. Work through "Ship it" in the README: rate limiting on the model routes, a spend limit in
   the Console, usage logged for every call, then deploy to Railway, Render or Fly with
   `CATALOG_DATA_DIR` on a persistent volume, and record the demo GIF.

**Try on purpose:**

- The failure drills from the study pack: an invalid API key, a tiny `max_tokens`, and a
  burst of requests against your own rate limit. Each should end in a clear message in the
  UI, never a blank page.
- Calibration: compare the "Model's own confidence" row with the "After reviewFlags()" row
  in `evals/report.md`. Do your checks separate right from wrong fields better than the
  model's own numbers?
- Save ten entries with honest corrections and read the correction rates on `/stats`. Which
  field do people fix most, and does the eval agree?

**Stretch, from the study pack:** estimate the monthly cost for 1,000 users saving 10 entries
a day, with your default model and with the cheapest one that passes, and put both numbers
in the README. Or rebuild `/api/first-look` with the Vercel AI SDK and compare.

**Done when:** `npm run progress` shows 8 of 8, `evals/report.md` from a 20-case run is
committed, and the README has a live link, a demo GIF and filled-in results.

**Interview angle:** "How do you know the catalogue entries are right, how much do you trust
the model's confidence, and what does one entry cost?"

## Later weeks that come back here

- **Week 9 (evals as a discipline):** add an opt-in CI job that runs `npm run eval` with an
  `ANTHROPIC_API_KEY` secret on pull requests that touch `src/lib/prompts.ts`,
  `schema.ts` or `extract.ts`, fails below `EVAL_MIN_SCORE`, and comments the report, like
  the one in the mcp-agent repo. Start error analysis from the correction log.
- **Week 10 (production concerns):** stage 2 of the [roadmap](ROADMAP.md): prompt caching
  on the system prompt, Postgres and object storage, auth, a spend cap, and injection
  cases. A product label is third-party text: a box that says "ignore your instructions"
  must end up in `visibleText`, not in your behaviour.
- **Week 11 (fine-tuning and the wider field):** use the saved corrections as a dataset and
  discuss distilling extraction to a cheaper model. Compare a small model with your best
  prompt against the eval set before you train anything.
- **Week 12 (interview-ready):** rehearse a 5-minute walkthrough: the problem, the diagram,
  why code checks sit next to the model, the eval and calibration numbers, cost per entry,
  and what you would do next.
