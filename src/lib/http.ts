/**
 * Uniform JSON envelope returned by every endpoint:
 *   { success: true,  data, meta? }
 *   { success: false, error: { code, message, details? } }
 */
export type Meta = Record<string, unknown>;

export interface ApiReply<T = unknown> {
  readonly __apiReply: true;
  status: number;
  data: T;
  meta?: Meta;
}

export const isApiReply = (v: unknown): v is ApiReply =>
  typeof v === "object" && v !== null && (v as ApiReply).__apiReply === true;

/** Wrap a handler result with an explicit status / meta. */
export function reply<T>(data: T, opts: { status?: number; meta?: Meta } = {}): ApiReply<T> {
  return { __apiReply: true, status: opts.status ?? 200, data, meta: opts.meta };
}

export const created = <T>(data: T, meta?: Meta) => reply(data, { status: 201, meta });
export const noContent = () => reply(null, { status: 204 });
