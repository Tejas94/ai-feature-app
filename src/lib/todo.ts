/**
 * Marks a piece of the project you are meant to write yourself.
 * Calling it throws, so the app and tests point straight at the missing piece.
 * Run `npm run todos` to list every one in order.
 */
export function todo(id: string, hint: string): never {
  throw new Error(`Not implemented yet: ${id}. ${hint}`);
}
