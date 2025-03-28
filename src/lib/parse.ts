import type { ZodSchema } from 'zod'

import {
  type ParamSchema,
  type ValueType,
  zodSchemaToParamSchema,
} from './schema.js'
import { isZodObject } from './zod.js'

export const parseUrlSearchParams = (
  query: URLSearchParams | string,
  schema: ZodSchema,
): Record<string, unknown> => {
  const searchParams =
    typeof query === 'string' ? new URLSearchParams(query) : query

  if (!isZodObject(schema)) {
    throw new Error(
      'The Zod schema to parse URL search params must be an ZodObject schema',
    )
  }

  const paramSchema = zodSchemaToParamSchema(schema)
  return parseFromParamSchema(searchParams, paramSchema, []) as Record<
    string,
    unknown
  >
}

const parseFromParamSchema = (
  searchParams: URLSearchParams,
  node: ParamSchema | ValueType,
  path: string[],
): Record<string, unknown> | unknown => {
  if (typeof node === 'string') {
    const key = path.join('.')
    return parse(key, searchParams.getAll(key), node)
  }

  const entries = Object.entries(node).reduce<
    Array<[string, Record<string, unknown> | unknown]>
  >((acc, entry) => {
    const [k, v] = entry
    const currentPath = [...path, k]
    return [...acc, [k, parseFromParamSchema(searchParams, v, currentPath)]]
  }, [])

  return Object.fromEntries(entries)
}

const parse = (k: string, values: string[], type: ValueType): unknown => {
  // TODO: Add better errors with coercion. If coercion fails, passthough?
  // TODO: Is this Number parsing safe?
  if (values.length === 0) return undefined
  if (type === 'number') return Number(values[0])
  if (type === 'boolean') return values[0] === 'true'
  if (type === 'string') return String(values[0])
  if (type === 'string_array') return values
  if (type === 'number_array') return values.map((v) => Number(v))
  throw new UnparseableSearchParamError(k, 'unsupported type')
}

export class UnparseableSearchParamError extends Error {
  constructor(name: string, message: string) {
    super(`Could not parse parameter: '${name}' ${message}`)
    this.name = this.constructor.name
  }
}
