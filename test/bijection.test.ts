import {
  type Params,
  serializeUrlSearchParams,
} from '@seamapi/url-search-params-serializer'
import test from 'ava'
import { z, type ZodSchema } from 'zod'

import { parseUrlSearchParams } from '@seamapi/url-search-params-parser'

const bijection = test.macro({
  title(providedTitle) {
    return `parses ${providedTitle}`
  },
  exec(t, input: Params, schema: ZodSchema) {
    t.deepEqual(
      parseUrlSearchParams(serializeUrlSearchParams(input), schema),
      input,
    )
    t.notThrows(() => schema.parse(input))
  },
})

test('empty params', bijection, {}, z.object({ foo: z.string().optional() }))

test(
  'nested params',
  bijection,
  {
    foo: 'a',
    bar: { baz: 'b' },
  },
  z.object({
    foo: z.string(),
    bar: z.object({ baz: z.string() }),
  }),
)

test(
  'string params',
  bijection,
  {
    foo: 'a',
    bar: 'a b c',
    baz: 'a,b',
    fizz: 'a&b=c?d#e',
    buzz: 'åéîøü 🚀',
  },
  z.object({
    foo: z.string(),
    bar: z.string(),
    baz: z.string(),
    fizz: z.string(),
    buzz: z.string(),
  }),
)

test(
  'number params',
  bijection,
  {
    foo: 0,
    bar: 1,
    baz: -1,
    fizz: 1.5,
    buzz: -1.5,
    fuzz: Number.MAX_SAFE_INTEGER,
  },
  z.object({
    foo: z.number(),
    bar: z.number(),
    baz: z.number(),
    fizz: z.number(),
    buzz: z.number(),
    fuzz: z.number(),
  }),
)

test(
  'boolean params',
  bijection,
  {
    foo: true,
    bar: false,
  },
  z.object({
    foo: z.boolean(),
    bar: z.boolean(),
  }),
)

test(
  'date params',
  bijection,
  {
    foo: new Date(0),
    bar: new Date('2025-02-25T07:20:00.123Z'),
  },
  z.object({
    foo: z.date(),
    bar: z.date(),
  }),
)

test(
  'null params',
  bijection,
  {
    foo: null,
    bar: null,
    baz: null,
    fizz: null,
  },
  z.object({
    foo: z.string().nullable(),
    bar: z.number().nullable(),
    baz: z.boolean().nullable(),
    fizz: z.date().nullable(),
  }),
)

test(
  'null object and record params',
  bijection,
  {
    foo: null,
    bar: null,
  },
  z.object({
    foo: z.object({ baz: z.string() }).nullable(),
    bar: z.record(z.string(), z.string()).nullable(),
  }),
)

test(
  'string array params',
  bijection,
  {
    foo: ['a'],
    bar: ['a', 'b'],
    baz: ['a b', 'c&d'],
  },
  z.object({
    foo: z.array(z.string()),
    bar: z.array(z.string()),
    baz: z.array(z.string()),
  }),
)

test(
  'number array params',
  bijection,
  {
    foo: [1],
    bar: [1, 2, 3],
    baz: [0, -1, 1.5],
  },
  z.object({
    foo: z.array(z.number()),
    bar: z.array(z.number()),
    baz: z.array(z.number()),
  }),
)

test(
  'date array params',
  bijection,
  {
    foo: [new Date(0)],
    bar: [new Date(0), new Date('2025-02-25T07:20:00.123Z')],
  },
  z.object({
    foo: z.array(z.date()),
    bar: z.array(z.date()),
  }),
)

test(
  'empty array params',
  bijection,
  {
    foo: [],
    bar: [],
  },
  z.object({
    foo: z.array(z.string()),
    bar: z.array(z.number()),
  }),
)

test(
  'record params',
  bijection,
  {
    foo: { a: 'x', b: 'y' },
    bar: { a: 1, b: 2 },
    baz: { a: true, b: false },
    fizz: { a: new Date(0) },
  },
  z.object({
    foo: z.record(z.string(), z.string()),
    bar: z.record(z.string(), z.number()),
    baz: z.record(z.string(), z.boolean()),
    fizz: z.record(z.string(), z.date()),
  }),
)

test(
  'nullable record value params',
  bijection,
  {
    foo: { a: 'x', b: null },
  },
  z.object({
    foo: z.record(z.string(), z.string().nullable()),
  }),
)

test(
  'null union record value params',
  bijection,
  {
    foo: { a: 'x', b: null },
  },
  z.object({
    foo: z.record(z.string(), z.union([z.string(), z.boolean(), z.null()])),
  }),
)

test(
  'enum and literal params',
  bijection,
  {
    foo: 'a',
    bar: 'b',
    baz: 1,
    fizz: true,
  },
  z.object({
    foo: z.enum(['a', 'b']),
    bar: z.literal('b'),
    baz: z.literal(1),
    fizz: z.literal(true),
  }),
)

test(
  'deeply nested params',
  bijection,
  {
    a: 'x',
    b: {
      c: 1,
      d: {
        e: [1, 2],
        f: { g: new Date(0) },
        h: { i: 'y' },
      },
    },
  },
  z.object({
    a: z.string(),
    b: z.object({
      c: z.number(),
      d: z.object({
        e: z.array(z.number()),
        f: z.record(z.string(), z.date()),
        h: z.object({ i: z.string() }),
      }),
    }),
  }),
)

test(
  'optional params',
  bijection,
  {
    foo: 'a',
  },
  z.object({
    foo: z.string().optional(),
    bar: z.number().optional(),
    baz: z.object({ fizz: z.string().optional() }).optional(),
  }),
)

test(
  'union params',
  bijection,
  {
    type: 'a',
    value: 1,
  },
  z.union([
    z.object({ type: z.literal('a'), value: z.number() }),
    z.object({ type: z.literal('b'), value: z.number() }),
  ]),
)

const notInvertible = test.macro({
  title(providedTitle) {
    return `does not invert ${providedTitle}`
  },
  exec(t, input: Params, schema: ZodSchema, expected: Params) {
    t.deepEqual(
      parseUrlSearchParams(serializeUrlSearchParams(input), schema),
      expected,
    )
  },
})

test(
  'the empty string, which is serialized as undefined',
  notInvertible,
  { foo: '' },
  z.object({ foo: z.string() }),
  {},
)

// An explicitly undefined property serializes to nothing at all,
// so it comes back absent rather than present and undefined.
test(
  'explicitly undefined params, which are serialized as undefined',
  notInvertible,
  { foo: 'a', bar: undefined, baz: { fizz: undefined } },
  z.object({
    foo: z.string(),
    bar: z.number().optional(),
    baz: z.object({ fizz: z.string().optional() }).optional(),
  }),
  { foo: 'a' },
)

test(
  'array values containing a comma',
  bijection,
  {
    foo: ['a,b', 'c,d'],
  },
  z.object({ foo: z.array(z.string()) }),
)

test(
  'params literally named with a bracket suffix',
  bijection,
  {
    'foo[]': 'a',
    bar: ['b', 'c'],
  },
  z.object({ 'foo[]': z.string(), bar: z.array(z.string()) }),
)

// When parsing generously, a single array value containing a comma
// is parsed using the comma array format.
test('does not invert array values containing a comma when strict is false', (t) => {
  const schema = z.object({ foo: z.array(z.string()) })
  t.deepEqual(
    parseUrlSearchParams(serializeUrlSearchParams({ foo: ['a,b'] }), schema, {
      strict: false,
    }),
    { foo: ['a', 'b'] },
  )
})

test(
  'the empty object, which is serialized as undefined',
  notInvertible,
  { foo: {}, bar: 1 },
  z.object({ foo: z.record(z.string(), z.string()), bar: z.number() }),
  { bar: 1 },
)

// The serializer documents that { foo: {}, bar: { baz: {} }, fizz: 1 }
// serializes to fizz=1, so nested empty objects are also not invertible.
test(
  'nested empty objects, which are serialized as undefined',
  notInvertible,
  { foo: {}, bar: { baz: {} }, fizz: 1 },
  z.object({
    foo: z.record(z.string(), z.string()),
    bar: z.object({ baz: z.record(z.string(), z.string()) }),
    fizz: z.number(),
  }),
  { fizz: 1 },
)

// The serialization of null and the empty array are the same,
// so the schema is what disambiguates them.
test('the empty array and null share a serialization', (t) => {
  const query = serializeUrlSearchParams({ foo: [] })
  t.is(query, serializeUrlSearchParams({ foo: null }))
  t.deepEqual(
    parseUrlSearchParams(query, z.object({ foo: z.array(z.string()) })),
    {
      foo: [],
    },
  )
  t.deepEqual(
    parseUrlSearchParams(query, z.object({ foo: z.string().nullable() })),
    { foo: null },
  )
})

test(
  'union record value types, which are all parsed as strings',
  notInvertible,
  { foo: { a: 1, b: 'x' } },
  z.object({ foo: z.record(z.string(), z.union([z.string(), z.number()])) }),
  { foo: { a: '1', b: 'x' } },
)
