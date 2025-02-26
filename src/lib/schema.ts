// TODO: unsupported types (parsing error):
// bigint: strings that are too big for Number
// any other arrays types, e.g., boolean_array, null_array
// arrays with mixed value types
// arrays containing object schemas or other arrays

import type { ZodTypeAny } from 'zod'

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

export const zodSchemaToParamSchema = (_schema: ZodTypeAny): ParamSchema => {
  return {}
}
