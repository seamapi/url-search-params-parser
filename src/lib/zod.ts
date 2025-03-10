import {
  type ZodArray,
  type ZodBoolean,
  ZodFirstPartyTypeKind,
  type ZodNumber,
  type ZodObject,
  type ZodTypeAny,
} from 'zod'

export const isZodObject = (
  schema: ZodTypeAny,
): schema is ZodObject<any, any> => {
  return schema._def.typeName === ZodFirstPartyTypeKind.ZodObject
}

export const isZodArray = (
  schema: ZodTypeAny,
): schema is ZodArray<any, any> => {
  return schema._def.typeName === ZodFirstPartyTypeKind.ZodArray
}

export const isZodString = (schema: ZodTypeAny): schema is ZodBoolean => {
  return (
    schema._def.typeName === ZodFirstPartyTypeKind.ZodString ||
    schema._def.innerType?._def.typeName === ZodFirstPartyTypeKind.ZodString
  )
}

export const isZodBoolean = (schema: ZodTypeAny): schema is ZodBoolean => {
  return (
    schema._def.typeName === ZodFirstPartyTypeKind.ZodBoolean ||
    schema._def.innerType?._def.typeName === ZodFirstPartyTypeKind.ZodBoolean
  )
}

export const isZodNumber = (schema: ZodTypeAny): schema is ZodNumber => {
  return (
    schema._def.typeName === ZodFirstPartyTypeKind.ZodNumber ||
    schema._def.innerType?._def.typeName === ZodFirstPartyTypeKind.ZodNumber
  )
}

export const isZodSchema = (schema: unknown): schema is ZodTypeAny => {
  if (schema == null) return false
  if (typeof schema !== 'object') return false
  return '_def' in schema
}
