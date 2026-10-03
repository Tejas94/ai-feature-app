import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Job } from "./jobs";
import { streamText } from "./llm";
import { FIT_SYSTEM_PROMPT } from "./prompts";

export async function loadCv(): Promise<string> {
  return readFile(path.join(process.cwd(), "data", "cv.md"), "utf8");
}

/** Builds the user turn for the "Explain my fit" feature and streams the answer. */
export async function* explainFit(job: Job) {
  const cv = await loadCv();
  const user = [
    "<cv>",
    cv,
    "</cv>",
    "<job>",
    `${job.title} at ${job.company} (${job.location}${job.remote ? ", remote OK" : ""})`,
    `Salary: ${job.salaryMin}-${job.salaryMax} ${job.currency}`,
    `Skills: ${job.skills.join(", ")}`,
    job.description,
    "</job>",
  ].join("\n");
  // Current Claude models think before they answer, and thinking tokens count toward
  // max_tokens. Keep answers short through the prompt (P1-04), not a tight cap here:
  // a low cap cuts the answer off mid-sentence with stop_reason "max_tokens".
  return yield* streamText({ system: FIT_SYSTEM_PROMPT, user, maxTokens: 4096 });
}
