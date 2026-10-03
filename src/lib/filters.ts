import { z } from "zod";

/**
 * The contract between the model and your code. The model fills this in from
 * a sentence like "remote senior React roles paying over 90k"; applyFilters()
 * in jobs.ts does the rest. Every field is optional: absent means "no filter".
 *
 * The .describe() text is sent to the model as part of the JSON schema, so it
 * is prompt text too. Tweaking it is a legitimate way to fix extraction bugs.
 */
export const JobFiltersSchema = z.object({
  titleKeywords: z
    .array(z.string())
    .optional()
    .describe("Words that should appear in the job title or description, e.g. ['AI', 'LLM']"),
  skills: z
    .array(z.string())
    .optional()
    .describe("Required skills or technologies, e.g. ['React', 'TypeScript']"),
  locations: z
    .array(z.string())
    .optional()
    .describe("City names the user asked for, e.g. ['London']"),
  remoteOnly: z.boolean().optional().describe("True only if the user asked for remote roles"),
  includeRemoteWithLocation: z
    .boolean()
    .optional()
    .describe("True if remote roles are also acceptable alongside the given locations"),
  minSeniority: z.enum(["junior", "mid", "senior", "staff"]).optional(),
  minSalary: z.number().optional().describe("Minimum annual salary as a full number, e.g. 90000"),
  currency: z.enum(["GBP", "EUR"]).optional(),
  postedWithinDays: z.number().optional(),
});

export type JobFilters = z.infer<typeof JobFiltersSchema>;
