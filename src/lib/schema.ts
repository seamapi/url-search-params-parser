import type { ZodTypeAny } from 'zod'

import {
  isZodArray,
  isZodBoolean,
  isZodDate,
  isZodDiscriminatedUnion,
  isZodEnum,
  isZodLiteral,
  isZodNativeEnum,
  isZodNever,
  isZodNull,
  isZodNumber,
  isZodObject,
  isZodRecord,
  isZodSchema,
  isZodString,
  isZodUnion,
  unwrapZodSchema,
  zodArrayElementType,
  zodLiteralValue,
  zodNativeEnumValues,
  zodRecordKeyType,
  zodRecordValueType,
  zodSchemaName,
  zodUnionOptions,
} from './zod.js'

export type PrimitiveType = 'string' | 'number' | 'boolean' | 'date'

export type ValueType =
  | PrimitiveType
  | 'null'
  | 'never'
  | 'string_array'
  | 'number_array'
  | 'date_array'
  | 'string_record'
  | 'number_record'
  | 'boolean_record'
  | 'date_record'

export interface ParamSchema {
  [key: string]: ParamSchema | ValueType
}

// Value types that carry no type information of their own,
// and so may be merged into any other value type when resolving a union.
const permissiveValueTypes: ValueType[] = ['null', 'never']

const arrayValueTypes: Partial<Record<ValueType, ValueType>> = {
  string: 'string_array',
  number: 'number_array',
  date: 'date_array',
}

const recordValueTypes: Partial<Record<ValueType, ValueType>> = {
  string: 'string_record',
  number: 'number_record',
  boolean: 'boolean_record',
  date: 'date_record',
}

export const zodSchemaToParamSchema = (schema: ZodTypeAny): ParamSchema => {
  const paramSchema = nestedZodSchemaToParamSchema(schema, [])
  if (typeof paramSchema === 'string') {
    throw new UnparseableSchemaError(
      [],
      'top level schema must be an object schema',
    )
  }
  return paramSchema
}

const nestedZodSchemaToParamSchema = (
  schema: ZodTypeAny,
  path: string[],
): ParamSchema | ValueType => {
  const { schema: inner, isNullable } = unwrapZodSchema(schema)

  if (isZodObject(inner)) return objectToParamSchema(inner, path)

  if (isZodUnion(inner) || isZodDiscriminatedUnion(inner)) {
    return unionToParamSchema(inner, path)
  }

  if (isZodRecord(inner)) return recordToValueType(inner, path)

  if (isZodArray(inner)) {
    if (isNullable) {
      throw new UnparseableSchemaError(
        path,
        'an array schema may not be nullable, ' +
          'since null and the empty array have the same serialization',
      )
    }
    return arrayToValueType(inner, path)
  }

  return primitiveToValueType(inner, path)
}

const objectToParamSchema = (
  schema: ZodTypeAny,
  path: string[],
): ParamSchema => {
  const shape = (schema as unknown as { shape: Record<string, unknown> }).shape

  const entries = Object.entries(shape).reduce<
    Array<[string, ParamSchema | ValueType]>
  >((acc, [k, v]) => {
    const currentPath = [...path, k]
    if (k.includes('.')) {
      throw new UnparseableSchemaError(
        currentPath,
        'object keys may not contain a dot "."',
      )
    }
    if (!isZodSchema(v)) {
      throw new UnparseableSchemaError(currentPath, 'unexpected non-zod schema')
    }
    return [...acc, [k, nestedZodSchemaToParamSchema(v, currentPath)]]
  }, [])

  return Object.fromEntries(entries)
}

const unionToParamSchema = (
  schema: ZodTypeAny,
  path: string[],
): ParamSchema | ValueType => {
  const options = zodUnionOptions(schema)

  if (options.length === 0) {
    throw new UnparseableSchemaError(path, 'a union schema must have options')
  }

  const resolved = options.map((option) =>
    nestedZodSchemaToParamSchema(option, path),
  )

  return resolved.reduce((a, b) => mergeParamSchemas(a, b, path))
}

// Flattens the options of a union into a single param schema,
// where properties present in only some options become optional,
// and properties present in more than one option must not conflict.
const mergeParamSchemas = (
  a: ParamSchema | ValueType,
  b: ParamSchema | ValueType,
  path: string[],
): ParamSchema | ValueType => {
  if (typeof a === 'string' && typeof b === 'string') {
    if (a === b) return a
    if (permissiveValueTypes.includes(a)) return b
    if (permissiveValueTypes.includes(b)) return a
    throw new UnparseableSchemaError(
      path,
      `a union schema may not mix the value types '${a}' and '${b}'`,
    )
  }

  if (typeof a === 'string') {
    if (permissiveValueTypes.includes(a)) return b
    throw new UnparseableSchemaError(
      path,
      `a union schema may not mix the value type '${a}' with an object schema`,
    )
  }

  if (typeof b === 'string') {
    if (permissiveValueTypes.includes(b)) return a
    throw new UnparseableSchemaError(
      path,
      `a union schema may not mix the value type '${b}' with an object schema`,
    )
  }

  const keys = new Set([...Object.keys(a), ...Object.keys(b)])

  const entries = [...keys].reduce<Array<[string, ParamSchema | ValueType]>>(
    (acc, k) => {
      const av = a[k]
      const bv = b[k]
      if (av == null) return bv == null ? acc : [...acc, [k, bv]]
      if (bv == null) return [...acc, [k, av]]
      return [...acc, [k, mergeParamSchemas(av, bv, [...path, k])]]
    },
    [],
  )

  return Object.fromEntries(entries)
}

const arrayToValueType = (schema: ZodTypeAny, path: string[]): ValueType => {
  const elementSchema = zodArrayElementType(schema)

  if (elementSchema == null) {
    throw new UnparseableSchemaError(
      path,
      'could not determine the array value type',
    )
  }

  const {
    schema: element,
    isNullable,
    isOptional,
  } = unwrapZodSchema(elementSchema)

  if (isNullable || isOptional) {
    throw new UnparseableSchemaError(
      path,
      'an array value type may not be nullable or optional, ' +
        'since arrays containing null or undefined are not serializable',
    )
  }

  assertNotNested(element, path, 'an array')

  const valueType = flatPrimitiveValueType(element, path, 'an array', false)

  // Not strictly necessary, but a deliberate choice
  // not to support such schemas in this version.
  if (valueType === 'boolean') {
    throw new UnparseableSchemaError(
      path,
      'an array value type may not be a boolean schema',
    )
  }

  const arrayValueType = arrayValueTypes[valueType]

  if (arrayValueType == null) {
    throw new UnparseableSchemaError(
      path,
      `an array value type may not be '${valueType}'`,
    )
  }

  return arrayValueType
}

const recordToValueType = (schema: ZodTypeAny, path: string[]): ValueType => {
  const keySchema = zodRecordKeyType(schema)
  const valueSchema = zodRecordValueType(schema)

  if (keySchema == null || valueSchema == null) {
    throw new UnparseableSchemaError(
      path,
      'could not determine the record key and value types',
    )
  }

  const { schema: key } = unwrapZodSchema(keySchema)

  if (!isZodString(key) && !isZodEnum(key)) {
    throw new UnparseableSchemaError(
      path,
      'a record key type must be a string schema',
    )
  }

  const { schema: value } = unwrapZodSchema(valueSchema)

  assertNotNested(value, path, 'a record')

  const valueType = flatPrimitiveValueType(value, path, 'a record', true)

  // A record of only null values carries no primitive type information,
  // so parse the values as strings.
  const recordValueType =
    valueType === 'null' ? 'string_record' : recordValueTypes[valueType]

  if (recordValueType == null) {
    throw new UnparseableSchemaError(
      path,
      `a record value type may not be '${valueType}'`,
    )
  }

  return recordValueType
}

const assertNotNested = (
  schema: ZodTypeAny,
  path: string[],
  context: string,
): void => {
  if (isZodObject(schema)) {
    throw new UnparseableSchemaError(
      path,
      `${context} value type may not be an object schema`,
    )
  }

  if (isZodArray(schema)) {
    throw new UnparseableSchemaError(
      path,
      `${context} value type may not be an array schema`,
    )
  }

  if (isZodRecord(schema)) {
    throw new UnparseableSchemaError(
      path,
      `${context} value type may not be a record schema`,
    )
  }
}

// Resolves a schema used as an array or record value type,
// where a union of primitives must collapse to a single primitive type.
//
// A record may coerce a mixed union to a string, which gives up
// invertibility in exchange for supporting less-strict schemas.
// An array must resolve to exactly one value type.
const flatPrimitiveValueType = (
  schema: ZodTypeAny,
  path: string[],
  context: string,
  allowStringCoercion: boolean,
): ValueType => {
  if (!isZodUnion(schema) && !isZodDiscriminatedUnion(schema)) {
    return primitiveToValueType(schema, path)
  }

  const options = zodUnionOptions(schema)

  if (options.length === 0) {
    throw new UnparseableSchemaError(path, 'a union schema must have options')
  }

  const valueTypes = options.map((option) => {
    const { schema: inner } = unwrapZodSchema(option)
    assertNotNested(inner, path, context)
    return flatPrimitiveValueType(inner, path, context, allowStringCoercion)
  })

  const distinct = [
    ...new Set(valueTypes.filter((t) => !permissiveValueTypes.includes(t))),
  ]

  const [first] = distinct
  if (first == null) return 'null'
  if (distinct.length === 1) return first

  const valueTypeList = distinct.map((t) => `'${t}'`).join(', ')

  if (!allowStringCoercion) {
    throw new UnparseableSchemaError(
      path,
      `${context} value type must be a single value type, ` +
        `but is a union of the value types ${valueTypeList}`,
    )
  }

  if (!distinct.includes('string')) {
    throw new UnparseableSchemaError(
      path,
      `${context} value type may not be a union of the value types ` +
        `${valueTypeList} unless the union includes a string schema`,
    )
  }

  return 'string'
}

const primitiveToValueType = (
  schema: ZodTypeAny,
  path: string[],
): ValueType => {
  if (isZodString(schema)) return 'string'
  if (isZodNumber(schema)) return 'number'
  if (isZodBoolean(schema)) return 'boolean'
  if (isZodDate(schema)) return 'date'
  if (isZodNull(schema)) return 'null'
  if (isZodNever(schema)) return 'never'
  if (isZodEnum(schema)) return 'string'
  if (isZodNativeEnum(schema)) return nativeEnumToValueType(schema, path)
  if (isZodLiteral(schema)) return literalToValueType(schema, path)

  throw new UnparseableSchemaError(
    path,
    `${zodSchemaName(schema)} is not supported`,
  )
}

const nativeEnumToValueType = (
  schema: ZodTypeAny,
  path: string[],
): ValueType => {
  const values = zodNativeEnumValues(schema)

  const valueTypes = [
    ...new Set(
      values.map((v) => {
        if (typeof v === 'string') return 'string'
        if (typeof v === 'number') return 'number'
        return null
      }),
    ),
  ]

  if (valueTypes.length === 1 && valueTypes[0] === 'string') return 'string'
  if (valueTypes.length === 1 && valueTypes[0] === 'number') return 'number'

  throw new UnparseableSchemaError(
    path,
    'a native enum schema must have only string values or only number values',
  )
}

const literalToValueType = (schema: ZodTypeAny, path: string[]): ValueType => {
  const value = zodLiteralValue(schema)
  if (value === null) return 'null'
  if (typeof value === 'string') return 'string'
  if (typeof value === 'number') return 'number'
  if (typeof value === 'boolean') return 'boolean'
  if (value instanceof Date) return 'date'

  throw new UnparseableSchemaError(
    path,
    `a literal schema of type ${typeof value} is not supported`,
  )
}

export class UnparseableSchemaError extends Error {
  constructor(path: string[], message: string) {
    const part = path.length === 0 ? '' : ` at ${path.join('.')}`
    super(`Could not parse Zod schema${part}: ${message}`)
    this.name = this.constructor.name
  }
}
