import type { ZodSchema } from 'zod'

import {
  type ParamSchema,
  type PrimitiveType,
  type ValueType,
  zodSchemaToParamSchema,
} from './schema.js'

// Value types that are parsed from a single search param value.
type LeafType = PrimitiveType | 'null'

const arrayElementTypes: Partial<Record<ValueType, LeafType>> = {
  string_array: 'string',
  number_array: 'number',
  date_array: 'date',
}

const recordElementTypes: Partial<Record<ValueType, LeafType>> = {
  string_record: 'string',
  number_record: 'number',
  boolean_record: 'boolean',
  date_record: 'date',
}

export const parseUrlSearchParams = (
  query: URLSearchParams | string,
  schema: ZodSchema,
): Record<string, unknown> => {
  const searchParams =
    typeof query === 'string' ? new URLSearchParams(query) : query

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
): unknown => {
  if (typeof node === 'string') {
    return parseValueType(searchParams, node, path)
  }

  const name = path.join('.')

  // An object serialized as a single value is either null or unparseable,
  // e.g., foo= for the schema z.object({ foo: z.object({ bar: z.string() }) }).
  if (path.length > 0 && searchParams.has(name)) {
    assertNoNestedParams(searchParams, name)
    return parseNestedValue(searchParams, name)
  }

  const entries = Object.entries(node).reduce<Array<[string, unknown]>>(
    (acc, [k, v]) => [
      ...acc,
      [k, parseFromParamSchema(searchParams, v, [...path, k])],
    ],
    [],
  )

  return Object.fromEntries(entries)
}

const parseValueType = (
  searchParams: URLSearchParams,
  type: ValueType,
  path: string[],
): unknown => {
  const name = path.join('.')

  // A never param can never hold a value.
  if (type === 'never') return undefined

  const arrayElementType = arrayElementTypes[type]
  if (arrayElementType != null) {
    return parseArrayParam(searchParams, name, arrayElementType)
  }

  const recordElementType = recordElementTypes[type]
  if (recordElementType != null) {
    return parseRecordParam(searchParams, name, recordElementType)
  }

  const values = searchParams.getAll(name)

  const [value] = values
  if (value == null) return undefined

  if (values.length > 1) {
    throw new UnparseableSearchParamError(
      name,
      'has repeated values but is not an array parameter',
    )
  }

  return parseLeaf(value, type as LeafType)
}

const parseArrayParam = (
  searchParams: URLSearchParams,
  name: string,
  elementType: LeafType,
): unknown => {
  const repeatedValues = searchParams.getAll(name)
  const bracketName = `${name}[]`
  const bracketValues = searchParams.getAll(bracketName)

  if (repeatedValues.length > 0 && bracketValues.length > 0) {
    throw new UnparseableSearchParamError(
      name,
      'mixes the repeated and bracket array formats',
    )
  }

  if (bracketValues.length > 0) {
    return parseArrayValues(bracketName, bracketValues, elementType, false)
  }

  if (repeatedValues.length === 0) return undefined

  return parseArrayValues(name, repeatedValues, elementType, true)
}

const parseArrayValues = (
  name: string,
  values: string[],
  elementType: LeafType,
  allowCommaFormat: boolean,
): unknown[] => {
  // The serialization of the empty array is a single empty value.
  if (values.length === 1 && isBlank(values[0] ?? '')) return []

  if (values.some(isBlank)) {
    throw new UnparseableSearchParamError(
      name,
      'mixes empty values with other values',
    )
  }

  const [value] = values

  if (values.some((v) => v.includes(','))) {
    if (!allowCommaFormat) {
      throw new UnparseableSearchParamError(
        name,
        'uses the bracket array format with a value containing a comma ","',
      )
    }

    if (values.length > 1 || value == null) {
      throw new UnparseableSearchParamError(
        name,
        'mixes the comma and repeated array formats, ' +
          'or repeats a value containing a comma ","',
      )
    }

    const parts = value.split(',')

    if (parts.some(isBlank)) {
      throw new UnparseableSearchParamError(
        name,
        'uses the comma array format with one or more empty values',
      )
    }

    return parts.map((v) => parseLeaf(v, elementType))
  }

  return values.map((v) => parseLeaf(v, elementType))
}

const parseRecordParam = (
  searchParams: URLSearchParams,
  name: string,
  elementType: LeafType,
): unknown => {
  if (searchParams.has(name)) {
    assertNoNestedParams(searchParams, name)
    return parseNestedValue(searchParams, name)
  }

  const prefix = `${name}.`
  const keys = [...new Set([...searchParams.keys()])].filter((k) =>
    k.startsWith(prefix),
  )

  if (keys.length === 0) return undefined

  const entries = keys.map<[string, unknown]>((k) => {
    const recordKey = k.slice(prefix.length)

    if (recordKey.includes('.') || recordKey.endsWith('[]')) {
      throw new UnparseableSearchParamError(
        k,
        'is nested inside a record parameter, ' +
          'but a record value type may not be an object, array, or record',
      )
    }

    const values = searchParams.getAll(k)
    const [value] = values

    if (value == null) return [recordKey, undefined]

    if (values.length > 1) {
      throw new UnparseableSearchParamError(
        k,
        'has repeated values but is not an array parameter',
      )
    }

    return [recordKey, parseLeaf(value, elementType)]
  })

  return Object.fromEntries(entries)
}

// Parses the value of a param whose schema is an object or a record,
// which is either null or a value this parser cannot interpret.
const parseNestedValue = (
  searchParams: URLSearchParams,
  name: string,
): unknown => {
  const values = searchParams.getAll(name)
  const [value] = values

  if (value == null) return undefined

  if (values.length > 1) {
    throw new UnparseableSearchParamError(
      name,
      'has repeated values but is not an array parameter',
    )
  }

  if (isBlank(value)) return null

  return value
}

const assertNoNestedParams = (
  searchParams: URLSearchParams,
  name: string,
): void => {
  const prefix = `${name}.`
  for (const k of searchParams.keys()) {
    if (k.startsWith(prefix)) {
      throw new UnparseableSearchParamError(
        name,
        `conflicts with the nested parameter '${k}'`,
      )
    }
  }
}

const parseLeaf = (value: string, type: LeafType): unknown => {
  // Zero-length strings are not serializable, so an empty value is null.
  if (type === 'string') return value.length === 0 ? null : value

  const trimmed = value.trim()

  if (trimmed.length === 0) return null

  if (type === 'number') return parseNumber(trimmed)
  if (type === 'boolean') return parseBoolean(trimmed)
  if (type === 'date') return parseDate(trimmed)

  // A null param has no other parseable value, so pass the value through.
  return trimmed
}

const parseNumber = (v: string): number | string => {
  if (v === 'Infinity' || v === '-Infinity') return v
  const n = Number(v)
  if (isNaN(n)) return v
  if (n === Infinity || n === -Infinity) return v
  return n
}

const truthyValues = ['true', 'True', 'TRUE', 'yes', 'Yes', 'YES', '1']
const falsyValues = ['false', 'False', 'FALSE', 'no', 'No', 'NO', '0']

const parseBoolean = (v: string): boolean | string => {
  if (truthyValues.includes(v)) return true
  if (falsyValues.includes(v)) return false
  return v
}

const parseDate = (v: string): Date | string => {
  const date = new Date(v)
  if (isNaN(date.getTime())) return v
  return date
}

const isBlank = (v: string): boolean => v.trim().length === 0

export class UnparseableSearchParamError extends Error {
  constructor(name: string, message: string) {
    super(`Could not parse parameter: '${name}' ${message}`)
    this.name = this.constructor.name
  }
}
