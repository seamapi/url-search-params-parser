import type { ZodTypeAny } from 'zod'

import {
  isZodArray,
  isZodBoolean,
  isZodNumber,
  isZodObject,
  isZodSchema,
  isZodString,
} from './zod.js'

export const parseUrlSearchParams = (
  query: URLSearchParams | string,
  schema: ZodTypeAny,
): Record<string, unknown> => {
  const searchParams =
    typeof query === 'string' ? new URLSearchParams(query) : query

  if (!isZodObject(schema)) {
    throw new Error(
      'The Zod schema to parse URL search params must be an ZodObject schema',
    )
  }

  const obj: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(
    schema.shape as unknown as Record<string, unknown>,
  )) {
    if (searchParams.has(k)) {
      if (isZodSchema(v)) obj[k] = parse(k, searchParams.getAll(k), v)
    }
  }

  return obj
}

const parse = (k: string, values: string[], schema: ZodTypeAny): unknown => {
  // TODO: Add better errors with coercion. If coercion fails, passthough?
  if (isZodNumber(schema)) return Number(values[0])
  if (isZodBoolean(schema)) return values[0] === 'true'
  if (isZodString(schema)) return String(values[0])
  if (isZodArray(schema)) return values
  throw new UnparseableSearchParamError(k, 'unsupported type')
}

export class UnparseableSearchParamError extends Error {
  constructor(name: string, message: string) {
    super(`Could not parse parameter: '${name}' ${message}`)
    this.name = this.constructor.name
  }
}
