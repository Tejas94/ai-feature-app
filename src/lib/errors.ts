import Anthropic from "@anthropic-ai/sdk";

/** A problem with what the client sent. Routes turn it into a 4xx JSON response. */
export class RequestError extends Error {
  constructor(
    message: string,
    readonly status: 400 | 404 | 413 | 415 = 400,
  ) {
    super(message);
    this.name = "RequestError";
  }
}

/** True for the error thrown by todo(): "Not implemented yet: P1-04. ..." */
export function isTodoError(err: unknown): err is Error {
  return err instanceof Error && /^Not implemented yet: P\d+-\d+/.test(err.message);
}

/** The TODO id inside a todo() error, e.g. "P1-04". */
export function todoId(err: unknown): string | undefined {
  return err instanceof Error ? /^Not implemented yet: (P\d+-\d+)/.exec(err.message)?.[1] : undefined;
}

export interface ErrorBody {
  error: string;
  /** Set when the error comes from an unfinished TODO. */
  todo?: string;
}

/** Maps any error to a status code and a JSON body the UI can show as is. */
export function describeError(err: unknown): { status: number; body: ErrorBody } {
  if (isTodoError(err)) return { status: 501, body: { error: err.message, todo: todoId(err) } };
  if (err instanceof RequestError) return { status: err.status, body: { error: err.message } };
  if (err instanceof Anthropic.AuthenticationError) {
    return { status: 500, body: { error: "The Anthropic API rejected the key. Check ANTHROPIC_API_KEY in .env.local." } };
  }
  if (err instanceof Anthropic.RateLimitError) {
    return { status: 429, body: { error: "Rate limited by the Anthropic API. Wait a moment and try again." } };
  }
  if (err instanceof Anthropic.APIError) {
    return { status: 502, body: { error: `Anthropic API error${err.status ? ` ${err.status}` : ""}: ${err.message}` } };
  }
  const message = err instanceof Error ? err.message : String(err);
  if (/api[_ ]?key|authToken|authentication/i.test(message)) {
    return { status: 500, body: { error: `${message} Copy .env.example to .env.local and set ANTHROPIC_API_KEY.` } };
  }
  return { status: 500, body: { error: message } };
}

export function errorResponse(err: unknown): Response {
  const { status, body } = describeError(err);
  if (status >= 500 && status !== 501) console.error(err);
  return Response.json(body, { status });
}
