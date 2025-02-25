import type { ZodSchema } from 'zod'

export const parseUrlSearchParams = (
  _query: URLSearchParams | string,
  _schema: ZodSchema,
): Record<string, unknown> => {
  // const _searchParams =
  //   typeof query === 'string' ? new URLSearchParams(query) : query
  return {}
}
