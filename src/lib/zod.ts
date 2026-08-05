import {
  type ZodArray,
  type ZodDiscriminatedUnion,
  type ZodEnum,
  ZodFirstPartyTypeKind,
  type ZodLiteral,
  type ZodNativeEnum,
  type ZodObject,
  type ZodRecord,
  type ZodTypeAny,
  type ZodUnion,
} from 'zod'

type TypeName = `${ZodFirstPartyTypeKind}`

const typeNameOf = (schema: ZodTypeAny): string | null => {
  const typeName: unknown = schema._def.typeName
  return typeof typeName === 'string' ? typeName : null
}

const isTypeName = (schema: ZodTypeAny, typeName: TypeName): boolean =>
  typeNameOf(schema) === typeName

// Wrapper schemas that do not affect how a value is serialized,
// and so may be transparently removed before inspecting a schema.
const wrapperTypeNames: string[] = [
  ZodFirstPartyTypeKind.ZodOptional,
  ZodFirstPartyTypeKind.ZodNullable,
  ZodFirstPartyTypeKind.ZodDefault,
  ZodFirstPartyTypeKind.ZodReadonly,
]

export interface UnwrappedZodSchema {
  schema: ZodTypeAny
  isOptional: boolean
  isNullable: boolean
}

// Recursively removes optional, nullable, default, and readonly wrappers,
// reporting whether the schema was optional or nullable at any level.
export const unwrapZodSchema = (schema: ZodTypeAny): UnwrappedZodSchema => {
  let current = schema
  let isOptional = false
  let isNullable = false

  for (;;) {
    const typeName = typeNameOf(current)
    if (typeName == null) break
    if (!wrapperTypeNames.includes(typeName)) break

    if (typeName === ZodFirstPartyTypeKind.ZodOptional) isOptional = true
    if (typeName === ZodFirstPartyTypeKind.ZodNullable) isNullable = true

    const innerType: unknown = current._def.innerType
    if (!isZodSchema(innerType)) break
    current = innerType
  }

  return { schema: current, isOptional, isNullable }
}

export const isZodObject = (
  schema: ZodTypeAny,
): schema is ZodObject<any, any> =>
  isTypeName(schema, ZodFirstPartyTypeKind.ZodObject)

export const isZodArray = (schema: ZodTypeAny): schema is ZodArray<any, any> =>
  isTypeName(schema, ZodFirstPartyTypeKind.ZodArray)

export const isZodRecord = (
  schema: ZodTypeAny,
): schema is ZodRecord<any, any> =>
  isTypeName(schema, ZodFirstPartyTypeKind.ZodRecord)

export const isZodUnion = (schema: ZodTypeAny): schema is ZodUnion<any> =>
  isTypeName(schema, ZodFirstPartyTypeKind.ZodUnion)

export const isZodDiscriminatedUnion = (
  schema: ZodTypeAny,
): schema is ZodDiscriminatedUnion<any, any> =>
  isTypeName(schema, ZodFirstPartyTypeKind.ZodDiscriminatedUnion)

export const isZodLiteral = (schema: ZodTypeAny): schema is ZodLiteral<any> =>
  isTypeName(schema, ZodFirstPartyTypeKind.ZodLiteral)

export const isZodEnum = (schema: ZodTypeAny): schema is ZodEnum<any> =>
  isTypeName(schema, ZodFirstPartyTypeKind.ZodEnum)

export const isZodNativeEnum = (
  schema: ZodTypeAny,
): schema is ZodNativeEnum<any> =>
  isTypeName(schema, ZodFirstPartyTypeKind.ZodNativeEnum)

export const isZodString = (schema: ZodTypeAny): boolean =>
  isTypeName(schema, ZodFirstPartyTypeKind.ZodString)

export const isZodNumber = (schema: ZodTypeAny): boolean =>
  isTypeName(schema, ZodFirstPartyTypeKind.ZodNumber)

export const isZodBoolean = (schema: ZodTypeAny): boolean =>
  isTypeName(schema, ZodFirstPartyTypeKind.ZodBoolean)

export const isZodDate = (schema: ZodTypeAny): boolean =>
  isTypeName(schema, ZodFirstPartyTypeKind.ZodDate)

export const isZodNull = (schema: ZodTypeAny): boolean =>
  isTypeName(schema, ZodFirstPartyTypeKind.ZodNull)

export const isZodNever = (schema: ZodTypeAny): boolean =>
  isTypeName(schema, ZodFirstPartyTypeKind.ZodNever)

export const isZodSchema = (schema: unknown): schema is ZodTypeAny => {
  if (schema == null) return false
  if (typeof schema !== 'object') return false
  return '_def' in schema
}

export const zodUnionOptions = (schema: ZodTypeAny): ZodTypeAny[] => {
  const options: unknown = isZodDiscriminatedUnion(schema)
    ? [...schema.options]
    : schema._def.options
  if (!Array.isArray(options)) return []
  return options.filter(isZodSchema)
}

export const zodRecordKeyType = (schema: ZodTypeAny): ZodTypeAny | null => {
  const keyType: unknown = schema._def.keyType
  return isZodSchema(keyType) ? keyType : null
}

export const zodRecordValueType = (schema: ZodTypeAny): ZodTypeAny | null => {
  const valueType: unknown = schema._def.valueType
  return isZodSchema(valueType) ? valueType : null
}

export const zodArrayElementType = (schema: ZodTypeAny): ZodTypeAny | null => {
  const elementType: unknown = schema._def.type
  return isZodSchema(elementType) ? elementType : null
}

export const zodLiteralValue = (schema: ZodTypeAny): unknown =>
  schema._def.value

export const zodNativeEnumValues = (schema: ZodTypeAny): unknown[] => {
  const values: unknown = schema._def.values
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
