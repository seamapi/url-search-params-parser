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
  if (values.length === 0) return undefined

  if (values[0] == null) {
    throw new Error(`Unexpected nil value when parsing ${k}`)
  }

  if (type === 'number') return parseNumber(values[0].trim())
  if (type === 'boolean') return parseBoolean(values[0].trim())
  if (type === 'string') return String(values[0])
  if (type === 'string_array') return values.map((v) => String(v))
  if (type === 'number_array') return values.map((v) => parseNumber(v))
  throw new UnparseableSearchParamError(k, 'unsupported type')
}

const parseNumber = (v: string): number | null | string => {
  if (v.length === 0) return null
  if (v === 'Infinity' || v === '-Infinity') return v
  const n = Number(v)
  if (isNaN(n)) return v
  if (n === Infinity || n === -Infinity) return v
  return n
}

const truthyValues = ['true', 'True', 'TRUE', 'yes', 'Yes', 'YES', '1']
const falsyValues = ['false', 'False', 'FALSE', 'no', 'No', 'NO', '0']

const parseBoolean = (v: string): boolean | null | string => {
  if (v.length === 0) return null
  if (truthyValues.includes(v)) return true
  if (falsyValues.includes(v)) return false
  return v
}

export class UnparseableSearchParamError extends Error {
  constructor(name: string, message: string) {
    super(`Could not parse parameter: '${name}' ${message}`)
    this.name = this.constructor.name
  }
}
