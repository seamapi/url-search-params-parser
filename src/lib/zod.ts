import type {
  ZodArray,
  ZodDiscriminatedUnion,
  ZodEnum,
  ZodLiteral,
  ZodNativeEnum,
  ZodObject,
  ZodRecord,
  ZodTypeAny,
  ZodUnion,
} from 'zod'

// Zod v3 style type names, e.g., ZodString.
// Zod v4 type names are normalized to this style.
type TypeName = string

// Internal schema definition, from _def in Zod v3 or _zod.def in Zod v4.
const defOf = (schema: ZodTypeAny): any =>
  '_zod' in schema ? (schema as any)._zod.def : (schema as any)._def

// Maps a Zod v4 def type, e.g., string,
// to the corresponding Zod v3 type name, e.g., ZodString.
// In Zod v4, some distinct Zod v3 types collapse into a single type:
// a discriminated union is a union and a native enum is an enum.
const zodV4TypeNames: Record<string, TypeName> = {
  any: 'ZodAny',
  array: 'ZodArray',
  bigint: 'ZodBigInt',
  boolean: 'ZodBoolean',
  date: 'ZodDate',
  default: 'ZodDefault',
  enum: 'ZodEnum',
  literal: 'ZodLiteral',
  map: 'ZodMap',
  never: 'ZodNever',
  null: 'ZodNull',
  nullable: 'ZodNullable',
  number: 'ZodNumber',
  object: 'ZodObject',
  optional: 'ZodOptional',
  pipe: 'ZodPipeline',
  readonly: 'ZodReadonly',
  record: 'ZodRecord',
  set: 'ZodSet',
  string: 'ZodString',
  symbol: 'ZodSymbol',
  tuple: 'ZodTuple',
  undefined: 'ZodUndefined',
  union: 'ZodUnion',
  unknown: 'ZodUnknown',
  void: 'ZodVoid',
}

const typeNameOf = (schema: ZodTypeAny): string | null => {
  if ('_zod' in schema) {
    const type: unknown = defOf(schema)?.type
    if (typeof type !== 'string') return null
    return (
      zodV4TypeNames[type] ??
      `Zod${type.charAt(0).toUpperCase()}${type.slice(1)}`
    )
  }
  const typeName: unknown = defOf(schema)?.typeName
  return typeof typeName === 'string' ? typeName : null
}

const isTypeName = (schema: ZodTypeAny, typeName: TypeName): boolean =>
  typeNameOf(schema) === typeName

// Wrapper schemas that do not affect how a value is serialized,
// and so may be transparently removed before inspecting a schema.
const wrapperTypeNames: string[] = [
  'ZodOptional',
  'ZodNullable',
  'ZodDefault',
  'ZodReadonly',
]

export interface UnwrappedZodSchema {
  schema: ZodTypeAny
  isOptional: boolean
  isNullable: boolean
}

// Recursively removes optional, nullable, default, readonly,
// effects, and pipeline wrappers,
// reporting whether the schema was optional or nullable at any level.
//
// Effects and pipelines, e.g., schemas using refine or transform,
// are unwrapped to the schema describing the parser input:
// applying the effect itself is left to the schema.
// In Zod v3, refinements and transforms wrap the schema in a ZodEffects.
// In Zod v4, refinements are checks on the schema itself,
// while transforms create a pipe.
export const unwrapZodSchema = (schema: ZodTypeAny): UnwrappedZodSchema => {
  let current = schema
  let isOptional = false
  let isNullable = false

  for (;;) {
    const typeName = typeNameOf(current)
    if (typeName == null) break

    let innerType: unknown

    if (wrapperTypeNames.includes(typeName)) {
      if (typeName === 'ZodOptional') isOptional = true
      if (typeName === 'ZodNullable') isNullable = true
      innerType = defOf(current)?.innerType
    } else if (typeName === 'ZodEffects') {
      innerType = defOf(current)?.schema
    } else if (typeName === 'ZodPipeline') {
      innerType = defOf(current)?.in
    } else {
      break
    }

    if (!isZodSchema(innerType)) break
    current = innerType
  }

  return { schema: current, isOptional, isNullable }
}

export const isZodObject = (
  schema: ZodTypeAny,
): schema is ZodObject<any, any> => isTypeName(schema, 'ZodObject')

export const isZodArray = (schema: ZodTypeAny): schema is ZodArray<any, any> =>
  isTypeName(schema, 'ZodArray')

export const isZodRecord = (
  schema: ZodTypeAny,
): schema is ZodRecord<any, any> => isTypeName(schema, 'ZodRecord')

export const isZodUnion = (schema: ZodTypeAny): schema is ZodUnion<any> =>
  isTypeName(schema, 'ZodUnion')

export const isZodDiscriminatedUnion = (
  schema: ZodTypeAny,
): schema is ZodDiscriminatedUnion<any, any> =>
  isTypeName(schema, 'ZodDiscriminatedUnion')

export const isZodLiteral = (schema: ZodTypeAny): schema is ZodLiteral<any> =>
  isTypeName(schema, 'ZodLiteral')

export const isZodEnum = (schema: ZodTypeAny): schema is ZodEnum<any> =>
  isTypeName(schema, 'ZodEnum')

export const isZodNativeEnum = (
  schema: ZodTypeAny,
): schema is ZodNativeEnum<any> => isTypeName(schema, 'ZodNativeEnum')

export const isZodString = (schema: ZodTypeAny): boolean =>
  isTypeName(schema, 'ZodString')

export const isZodNumber = (schema: ZodTypeAny): boolean =>
  isTypeName(schema, 'ZodNumber')

export const isZodBoolean = (schema: ZodTypeAny): boolean =>
  isTypeName(schema, 'ZodBoolean')

export const isZodDate = (schema: ZodTypeAny): boolean =>
  isTypeName(schema, 'ZodDate')

export const isZodNull = (schema: ZodTypeAny): boolean =>
  isTypeName(schema, 'ZodNull')

export const isZodNever = (schema: ZodTypeAny): boolean =>
  isTypeName(schema, 'ZodNever')

export const isZodSchema = (schema: unknown): schema is ZodTypeAny => {
  if (schema == null) return false
  if (typeof schema !== 'object') return false
  return '_def' in schema || '_zod' in schema
}

export const zodUnionOptions = (schema: ZodTypeAny): ZodTypeAny[] => {
  const options: unknown = isZodDiscriminatedUnion(schema)
    ? [...schema.options]
    : defOf(schema)?.options
  if (!Array.isArray(options)) return []
  return options.filter(isZodSchema)
}

export const zodRecordKeyType = (schema: ZodTypeAny): ZodTypeAny | null => {
  const keyType: unknown = defOf(schema)?.keyType
  return isZodSchema(keyType) ? keyType : null
}

export const zodRecordValueType = (schema: ZodTypeAny): ZodTypeAny | null => {
  const valueType: unknown = defOf(schema)?.valueType
  return isZodSchema(valueType) ? valueType : null
}

export const zodArrayElementType = (schema: ZodTypeAny): ZodTypeAny | null => {
  const def = defOf(schema)
  // Zod v3 stores the element schema in type, Zod v4 in element.
  const elementType: unknown = def?.element ?? def?.type
  return isZodSchema(elementType) ? elementType : null
}

// The literal values of a schema.
// A Zod v3 literal has a single value, a Zod v4 literal may have many.
export const zodLiteralValues = (schema: ZodTypeAny): unknown[] => {
  const def = defOf(schema)
  if (Array.isArray(def?.values)) return def.values
  return [def?.value]
}

// The values of an enum or native enum schema.
// Zod v3 enums store an array of values,
// while Zod v3 native enums and all Zod v4 enums
// store an object of enum entries.
export const zodEnumValues = (schema: ZodTypeAny): unknown[] => {
  const def = defOf(schema)
  const values: unknown = def?.values ?? def?.entries

  if (Array.isArray(values)) return values
  if (values == null || typeof values !== 'object') return []

  const obj = values as Record<string, unknown>

  // TypeScript numeric enums also define a reverse mapping from value to key,
  // which must be filtered out to recover the enum values.
  return Object.keys(obj)
    .filter((k) => typeof obj[String(obj[k])] !== 'number')
    .map((k) => obj[k])
}

// A human readable name for a schema, used in error messages.
export const zodSchemaName = (schema: ZodTypeAny): string => {
  const typeName = typeNameOf(schema)
  if (typeName == null) return 'an unrecognized schema'
  return `a z.${typeName.replace(/^Zod/, '').toLowerCase()}() schema`
}
