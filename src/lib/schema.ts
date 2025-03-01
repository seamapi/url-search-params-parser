// TODO: unsupported types (parsing error):
// bigint: strings that are too big for Number
// any other arrays types, e.g., boolean_array, null_array
// arrays with mixed value types
// arrays containing object schemas or other arrays

import type { ZodTypeAny } from 'zod'

import {
  isZodArray,
  isZodBoolean,
  isZodNumber,
  isZodObject,
  isZodSchema,
  isZodString,
} from './zod.js'

type ValueType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'date'
  | 'string_array'
  | 'number_array'

interface ParamSchema {
  [key: string]: ParamSchema | ValueType
}

export const zodSchemaToParamSchema = (schema: ZodTypeAny): ParamSchema => {
  if (!isZodObject(schema)) {
    throw new UnparseableSchemaError(
      [],
      'top level schema must be an object schema',
    )
  }
  const paramSchema = nestedZodSchemaToParamSchema(schema, [])
  if (typeof paramSchema === 'string') {
    throw new Error('Expected ParamSchema not ValueType')
  }
  return paramSchema
}

const nestedZodSchemaToParamSchema = (
  schema: ZodTypeAny,
  path: string[],
): ParamSchema | ValueType => {
  if (isZodObject(schema)) {
    const shape = schema.shape as unknown as Record<string, unknown>
    const entries = Object.entries(shape).reduce<
      Array<[string, ParamSchema | ValueType]>
    >((acc, entry) => {
      const [k, v] = entry
      const currentPath = [...path, k]
      if (isZodSchema(v)) {
        return [...acc, [k, nestedZodSchemaToParamSchema(v, currentPath)]]
      }
      throw new UnparseableSchemaError(currentPath, 'unexpected non-zod schema')
    }, [])
    return Object.fromEntries(entries)
  }

  if (isZodNumber(schema)) return 'number'
  if (isZodString(schema)) return 'string'
  if (isZodBoolean(schema)) return 'boolean'
  if (isZodArray(schema)) {
    // TODO: handle number_array
    return 'string_array'
  }

  throw new UnparseableSchemaError(path, `schema type is not supported`)
}

export class UnparseableSchemaError extends Error {
  constructor(path: string[], message: string) {
    const part = path.length === 0 ? '' : ` at ${path.join('.')}`
    super(`Could not parse Zod schema${part}: ${message}`)
    this.name = this.constructor.name
  }
}
