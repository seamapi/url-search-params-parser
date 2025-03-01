// TODO: unsupported types (parsing error):
// bigint: strings that are too big for Number
// any other arrays types, e.g., boolean_array, null_array
// arrays with mixed value types
// arrays containing object schemas or other arrays

import type { ZodTypeAny } from 'zod'

import { isZodObject } from './zod.js'

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
      'top level schema must be an object schema',
    )
  }
  return {}
}

export class UnparseableSchemaError extends Error {
  constructor(message: string) {
    super(`Could not parse Zod schema: ${message}`)
    this.name = this.constructor.name
  }
}
