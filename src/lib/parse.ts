import type { ZodSchema } from 'zod'

import {
  type ParamSchema,
  type PrimitiveType,
  type ValueType,
  zodSchemaToParamSchema,
} from './schema.js'

// Value types that are parsed from a single search param value.
type LeafType = PrimitiveType | 'null'

// How array values containing a comma are handled:
// split into the array (the comma array format),
// rejected as unparseable, or kept verbatim.
type CommaHandling = 'split' | 'reject' | 'verbatim'

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

export interface ParseUrlSearchParamsOptions {
  /**
   * When true, the default, only parse the expected output of
   * @seamapi/url-search-params-serializer, making the parser
   * a true inverse of the serializer.
   * When false, enable generous parsing: additional input formats
   * are accepted, at the cost of some limitations,
   * e.g., array values may not contain a comma.
   */
  strict?: boolean
}

export const parseUrlSearchParams = (
  query: URLSearchParams | string,
  schema: ZodSchema,
  options: ParseUrlSearchParamsOptions = {},
): Record<string, unknown> => {
  const { strict = true } = options

  const searchParams =
    typeof query === 'string' ? new URLSearchParams(query) : query

  const paramSchema = zodSchemaToParamSchema(schema)

  return parseFromParamSchema(searchParams, paramSchema, [], strict) as Record<
    string,
    unknown
  >
}

const parseFromParamSchema = (
  searchParams: URLSearchParams,
  node: ParamSchema | ValueType,
  path: string[],
  strict: boolean,
): unknown => {
  if (typeof node === 'string') {
    return parseValueType(searchParams, node, path, strict)
  }

  const name = path.join('.')

  // An object serialized as a single value is either null or unparseable,
  // e.g., foo= for the schema z.object({ foo: z.object({ bar: z.string() }) }).
  if (path.length > 0 && searchParams.has(name)) {
    assertNoNestedParams(searchParams, name)
    return parseNestedValue(searchParams, name, strict)
  }

  const entries = Object.entries(node).reduce<Array<[string, unknown]>>(
    (acc, [k, v]) => [
      ...acc,
      [k, parseFromParamSchema(searchParams, v, [...path, k], strict)],
    ],
    [],
  )

  return Object.fromEntries(entries)
}

const parseValueType = (
  searchParams: URLSearchParams,
  type: ValueType,
  path: string[],
  strict: boolean,
): unknown => {
  const name = path.join('.')

  // A never param can never hold a value.
  if (type === 'never') return undefined

  const arrayElementType = arrayElementTypes[type]
  if (arrayElementType != null) {
    return parseArrayParam(searchParams, name, arrayElementType, strict)
  }

  const recordElementType = recordElementTypes[type]
  if (recordElementType != null) {
    return parseRecordParam(searchParams, name, recordElementType, strict)
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

  return parseLeaf(value, type as LeafType, strict)
}

const parseArrayParam = (
  searchParams: URLSearchParams,
  name: string,
  elementType: LeafType,
  strict: boolean,
): unknown => {
  const repeatedValues = searchParams.getAll(name)
  const bracketName = `${name}[]`
  const bracketValues = searchParams.getAll(bracketName)

  if (strict && bracketValues.length > 0) {
    throw new UnparseableSearchParamError(
      bracketName,
      'uses the bracket array format, ' +
        'which is never output by the serializer ' +
        'and only parsed when strict is false',
    )
  }

  if (repeatedValues.length > 0 && bracketValues.length > 0) {
    throw new UnparseableSearchParamError(
      name,
      'mixes the repeated and bracket array formats',
    )
  }

  if (bracketValues.length > 0) {
    return parseArrayValues(bracketName, bracketValues, elementType, {
      commaHandling: 'reject',
      strict,
    })
  }

  if (repeatedValues.length === 0) return undefined

  return parseArrayValues(name, repeatedValues, elementType, {
    commaHandling: strict ? 'verbatim' : 'split',
    strict,
  })
}

const parseArrayValues = (
  name: string,
  values: string[],
  elementType: LeafType,
  { commaHandling, strict }: { commaHandling: CommaHandling; strict: boolean },
): unknown[] => {
  // The serialization of the empty array is a single empty value.
  if (values.length === 1 && isEmpty(values[0] ?? '', strict)) return []

  if (values.some((v) => isEmpty(v, strict))) {
    throw new UnparseableSearchParamError(
      name,
      'mixes empty values with other values',
    )
  }

  const [value] = values

  if (commaHandling !== 'verbatim' && values.some((v) => v.includes(','))) {
    if (commaHandling === 'reject') {
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

    if (parts.some((v) => isEmpty(v, strict))) {
      throw new UnparseableSearchParamError(
        name,
        'uses the comma array format with one or more empty values',
      )
    }

    return parts.map((v) => parseLeaf(v, elementType, strict))
  }

  return values.map((v) => parseLeaf(v, elementType, strict))
}

const parseRecordParam = (
  searchParams: URLSearchParams,
  name: string,
  elementType: LeafType,
  strict: boolean,
): unknown => {
  if (searchParams.has(name)) {
    assertNoNestedParams(searchParams, name)
    return parseNestedValue(searchParams, name, strict)
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

    return [recordKey, parseLeaf(value, elementType, strict)]
  })

  return Object.fromEntries(entries)
}

// Parses the value of a param whose schema is an object or a record,
// which is either null or a value this parser cannot interpret.
const parseNestedValue = (
  searchParams: URLSearchParams,
  name: string,
  strict: boolean,
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

  if (isEmpty(value, strict)) return null

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

const parseLeaf = (value: string, type: LeafType, strict: boolean): unknown => {
  // Zero-length strings are not serializable, so an empty value is null.
  if (type === 'string') return value.length === 0 ? null : value

  if (strict) {
    if (value.length === 0) return null

    // The serializer never pads values with whitespace,
    // so pass such values through unchanged.
    if (value.trim() !== value) return value

    if (type === 'number') return parseNumber(value)
    if (type === 'boolean') return parseStrictBoolean(value)
    if (type === 'date') return parseDate(value)

    // A null param has no other parseable value, so pass the value through.
    return value
  }

  const trimmed = value.trim()

  if (trimmed.length === 0) return null

  if (type === 'number') return parseNumber(trimmed)
  if (type === 'boolean') return parseGenerousBoolean(trimmed)
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

const parseGenerousBoolean = (v: string): boolean | string => {
  if (truthyValues.includes(v)) return true
  if (falsyValues.includes(v)) return false
  return v
}

// The serializer only outputs the strings true and false.
const parseStrictBoolean = (v: string): boolean | string => {
  if (v === 'true') return true
  if (v === 'false') return false
  return v
}

const parseDate = (v: string): Date | string => {
  const date = new Date(v)
  if (isNaN(date.getTime())) return v
  return date
}

// The serializer never outputs whitespace-only values,
// so they are only treated as empty when parsing generously.
const isEmpty = (v: string, strict: boolean): boolean =>
  strict ? v.length === 0 : v.trim().length === 0

export class UnparseableSearchParamError extends Error {
  constructor(name: string, message: string) {
    super(`Could not parse parameter: '${name}' ${message}`)
    this.name = this.constructor.name
  }
}
