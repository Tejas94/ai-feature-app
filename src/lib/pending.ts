import { isTodoError, todoId } from "./errors";

/** A step that could not run, shown in the UI and the eval report instead of a crash. */
export interface Pending {
  /** The TODO id when the step is an unfinished TODO, e.g. "P1-05". */
  todo?: string;
  step: string;
  message: string;
}

/**
 * Runs an optional step. If it throws (most often an unfinished TODO), records why
 * in `pending` and returns null, so the rest of the request still works.
 */
export function optional<T>(step: string, pending: Pending[], fn: () => T): T | null {
  try {
    return fn();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    pending.push({ step, message, ...(isTodoError(err) ? { todo: todoId(err) } : {}) });
    return null;
  }
}
