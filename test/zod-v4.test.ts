import test from 'ava'
import type { ZodSchema } from 'zod'
import { z } from 'zod-v4'

import {
  parseUrlSearchParams,
  type ParseUrlSearchParamsOptions,
  UnparseableSchemaError,
  UnparseableSearchParamError,
} from '@seamapi/url-search-params-parser'

// The parser inspects Zod internals, which changed between Zod v3 and v4.
// These tests mirror the core parsing behavior using schemas built with Zod v4.
const parse = (
  query: string,
  schema: unknown,
  options?: ParseUrlSearchParamsOptions,
): unknown => parseUrlSearchParams(query, schema as ZodSchema, options)

test('zod-v4: parses primitive types', (t) => {
  const schema = z.object({
    name: z.string(),
    age: z.number(),
    isAdmin: z.boolean(),
    createdAt: z.date(),
  })
  t.deepEqual(
    parse(
      'name=Dax&age=27&isAdmin=true&createdAt=2023-01-01T00:00:00.000Z',
      schema,
    ),
    {
      name: 'Dax',
      age: 27,
      isAdmin: true,
      createdAt: new Date('2023-01-01T00:00:00.000Z'),
    },
  )
})

test('zod-v4: parses optional, nullable, default, and readonly wrappers', (t) => {
  const schema = z.object({
    a: z.string().optional(),
    b: z.number().nullable(),
    c: z.boolean().default(true),
    d: z.string().readonly(),
  })
  t.deepEqual(parse('b=&c=false&d=x', schema), {
    b: null,
    c: false,
    d: 'x',
  })
})

test('zod-v4: parses arrays in all three formats when strict is false', (t) => {
  const schema = z.object({ foo: z.array(z.string()) })
  t.deepEqual(parse('foo=a&foo=b', schema), { foo: ['a', 'b'] })
  t.deepEqual(parse('foo=', schema), { foo: [] })
  t.deepEqual(parse('foo[]=a&foo[]=b', schema, { strict: false }), {
    foo: ['a', 'b'],
  })
  t.deepEqual(parse('foo=a,b', schema, { strict: false }), { foo: ['a', 'b'] })
  t.deepEqual(parse('foo=a,b', schema), { foo: ['a,b'] })
})

test('zod-v4: parses number arrays', (t) => {
  const schema = z.object({ foo: z.array(z.number()) })
  t.deepEqual(parse('foo=1&foo=2', schema), { foo: [1, 2] })
})

test('zod-v4: parses nested objects', (t) => {
  const schema = z.object({
    foo: z.object({ bar: z.string(), baz: z.number() }),
  })
  t.deepEqual(parse('foo.bar=a&foo.baz=1', schema), {
    foo: { bar: 'a', baz: 1 },
  })
})

test('zod-v4: parses records', (t) => {
  const schema = z.object({ foo: z.record(z.string(), z.number()) })
  t.deepEqual(parse('foo.a=1&foo.b=2', schema), { foo: { a: 1, b: 2 } })
})

test('zod-v4: parses unions of objects', (t) => {
  const schema = z.union([
    z.object({ a: z.string() }),
    z.object({ b: z.number() }),
  ])
  t.deepEqual(parse('a=x&b=2', schema), { a: 'x', b: 2 })
})

test('zod-v4: parses discriminated unions', (t) => {
  const schema = z.discriminatedUnion('type', [
    z.object({ type: z.literal('a'), a: z.string() }),
    z.object({ type: z.literal('b'), b: z.number() }),
  ])
  t.deepEqual(parse('type=b&b=2', schema), {
    type: 'b',
    b: 2,
  })
})

test('zod-v4: parses string enums', (t) => {
  const schema = z.object({ foo: z.enum(['a', 'b']) })
  t.deepEqual(parse('foo=a', schema), { foo: 'a' })
})

test('zod-v4: parses enums of numeric TypeScript enums as numbers', (t) => {
  enum Level {
    Low = 1,
    High = 2,
  }
  const schema = z.object({ foo: z.enum(Level) })
  t.deepEqual(parse('foo=2', schema), { foo: 2 })
})

test('zod-v4: parses enum arrays', (t) => {
  const schema = z.object({ foo: z.array(z.enum(['a', 'b'])) })
  t.deepEqual(parse('foo=a,b', schema, { strict: false }), { foo: ['a', 'b'] })
})

test('zod-v4: parses literals', (t) => {
  const schema = z.object({
    foo: z.literal('x'),
    bar: z.literal(2),
    baz: z.literal(['p', 'q']),
  })
  t.deepEqual(parse('foo=x&bar=2&baz=q', schema), {
    foo: 'x',
    bar: 2,
    baz: 'q',
  })
})

test('zod-v4: parses schemas with refinements', (t) => {
  const schema = z
    .object({
      foo: z.string().refine((v) => v.length > 0),
      bar: z
        .boolean()
        .default(true)
        .refine((v) => v),
    })
    .refine((data) => data.foo !== 'nope')
  t.deepEqual(parse('foo=a&bar=false', schema), { foo: 'a', bar: false })
})

test('zod-v4: parses schemas with transforms as their input type', (t) => {
  const schema = z.object({
    foo: z.number().transform((v) => String(v)),
  })
  t.deepEqual(parse('foo=2', schema), { foo: 2 })
})

test('zod-v4: parses null and never properties', (t) => {
  const schema = z.object({ foo: z.null(), bar: z.never().optional() })
  t.deepEqual(parse('foo=', schema), { foo: null })
})

test('zod-v4: throws UnparseableSearchParamError on ambiguous input', (t) => {
  const schema = z.object({ foo: z.array(z.string()) })
  t.throws(() => parse('foo=a&foo[]=b', schema, { strict: false }), {
    instanceOf: UnparseableSearchParamError,
  })
  t.throws(() => parse('foo[]=a,b', schema, { strict: false }), {
    instanceOf: UnparseableSearchParamError,
  })
})

test('zod-v4: throws UnparseableSearchParamError on repeated non-array params', (t) => {
  const schema = z.object({ foo: z.string() })
  t.throws(() => parse('foo=a&foo=b', schema), {
    instanceOf: UnparseableSearchParamError,
  })
})

test('zod-v4: throws UnparseableSchemaError on unsupported schemas', (t) => {
  t.throws(() => parse('foo=a', z.string()), {
    instanceOf: UnparseableSchemaError,
  })
  t.throws(() => parse('foo=a', z.object({ foo: z.bigint() })), {
    instanceOf: UnparseableSchemaError,
  })
  t.throws(() => parse('foo=a', z.object({ foo: z.array(z.boolean()) })), {
    instanceOf: UnparseableSchemaError,
  })
})

test('zod-v4: generous parsing passes through invalid values as strings', (t) => {
  const schema = z.object({
    age: z.number(),
    isAdmin: z.boolean(),
  })
  t.deepEqual(parse('age=a&isAdmin=b', schema), { age: 'a', isAdmin: 'b' })
})
