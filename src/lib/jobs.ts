import jobsData from "../../data/jobs.json";
import type { JobFilters } from "./filters";

export type Seniority = "junior" | "mid" | "senior" | "staff";

export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  remote: boolean;
  seniority: Seniority;
  salaryMin: number;
  salaryMax: number;
  currency: "GBP" | "EUR";
  skills: string[];
  postedDaysAgo: number;
  description: string;
}

export const jobs: Job[] = jobsData as Job[];

export function getJob(id: string): Job | undefined {
  return jobs.find((j) => j.id === id);
}

const SENIORITY_ORDER: Seniority[] = ["junior", "mid", "senior", "staff"];

const lower = (s: string) => s.toLowerCase();

/**
 * Plain, deterministic filtering. The model's only job is to turn a sentence
 * into a JobFilters object; this function does the actual filtering. Keeping
 * the LLM out of the part that must be exact is a pattern you will reuse a lot.
 */
export function applyFilters(all: Job[], f: JobFilters): Job[] {
  return all.filter((job) => {
    if (f.remoteOnly && !job.remote) return false;
    if (f.locations?.length) {
      const hit = f.locations.some((loc) => lower(job.location).includes(lower(loc)));
      if (!hit && !(job.remote && f.includeRemoteWithLocation)) return false;
    }
    if (f.minSeniority) {
      if (SENIORITY_ORDER.indexOf(job.seniority) < SENIORITY_ORDER.indexOf(f.minSeniority)) return false;
    }
    if (f.minSalary != null) {
      if (f.currency && f.currency !== job.currency) return false;
      if (job.salaryMax < f.minSalary) return false;
    }
    if (f.skills?.length) {
      const jobSkills = job.skills.map(lower);
      if (!f.skills.every((s) => jobSkills.some((js) => js.includes(lower(s))))) return false;
    }
    if (f.titleKeywords?.length) {
      const text = lower(`${job.title} ${job.description}`);
      if (!f.titleKeywords.some((k) => text.includes(lower(k)))) return false;
    }
    if (f.postedWithinDays != null && job.postedDaysAgo > f.postedWithinDays) return false;
    return true;
  });
}
