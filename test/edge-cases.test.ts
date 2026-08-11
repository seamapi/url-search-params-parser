import test from 'ava'
import { z } from 'zod'

import {
  parseUrlSearchParams,
  UnparseableSearchParamError,
} from '@seamapi/url-search-params-parser'

test('pass though number values that do not parse as number', (t) => {
  t.deepEqual(parseUrlSearchParams('foo=a', z.object({ foo: z.number() })), {
    foo: 'a',
  })
  t.deepEqual(parseUrlSearchParams('foo=NaN', z.object({ foo: z.number() })), {
    foo: 'NaN',
  })
  t.deepEqual(
    parseUrlSearchParams('foo=Infinity', z.object({ foo: z.number() })),
    {
      foo: 'Infinity',
    },
  )
  t.deepEqual(
    parseUrlSearchParams('foo=-Infinity', z.object({ foo: z.number() })),
    {
      foo: '-Infinity',
    },
  )
})

test('pass though boolean values that do not parse as truthy or falsy values', (t) => {
  t.deepEqual(parseUrlSearchParams('foo=a', z.object({ foo: z.boolean() })), {
    foo: 'a',
  })
  t.deepEqual(parseUrlSearchParams('foo=tRue', z.object({ foo: z.number() })), {
    foo: 'tRue',
  })
})

test('pass though date values that do not parse as a date', (t) => {
  t.deepEqual(parseUrlSearchParams('foo=a', z.object({ foo: z.date() })), {
    foo: 'a',
  })
  t.deepEqual(
    parseUrlSearchParams('foo=not-a-date', z.object({ foo: z.date() })),
    { foo: 'not-a-date' },
  )
})

test('pass though object values that do not parse as an object', (t) => {
  t.deepEqual(
    parseUrlSearchParams(
      'foo=a',
      z.object({ foo: z.object({ bar: z.string() }) }),
    ),
    { foo: 'a' },
  )
  t.deepEqual(
    parseUrlSearchParams('foo=a', z.object({ foo: z.record(z.string()) })),
    { foo: 'a' },
  )
})

test('omits missing params', (t) => {
  t.deepEqual(
    parseUrlSearchParams(
      '',
      z.object({
        a: z.string(),
        b: z.number(),
        c: z.boolean(),
        d: z.date(),
        e: z.array(z.string()),
        f: z.record(z.string(), z.string()),
        g: z.object({ h: z.string() }),
      }),
    ),
    {},
  )
})

test('omits optional params that are not in the query string', (t) => {
  t.deepEqual(
    parseUrlSearchParams(
      'foo=a',
      z.object({
        foo: z.string(),
        bar: z.string().optional(),
        baz: z.object({ fizz: z.string() }).optional(),
      }),
    ),
    { foo: 'a' },
  )
})

test('ignores params not present in the schema', (t) => {
  t.deepEqual(
    parseUrlSearchParams(
      'foo=a&bar=b&fizz.buzz=c',
      z.object({ foo: z.string() }),
    ),
    { foo: 'a' },
  )
})

test('omits never params', (t) => {
  t.deepEqual(parseUrlSearchParams('foo=a', z.object({ foo: z.never() })), {})
})

// e.g., foo.bar= would conflict with foo.bar.a= or foo.bar.b=2
// since this would be a null object containing values (null is still a value).
test('cannot parse conflicting object keys', (t) => {
  const schema = z.object({
    foo: z.object({ bar: z.object({ a: z.number(), b: z.number() }) }),
  })
  t.throws(() => parseUrlSearchParams('foo.bar=&foo.bar.a=1', schema), {
    instanceOf: UnparseableSearchParamError,
  })
  t.throws(() => parseUrlSearchParams('foo.bar=x&foo.bar.b=2', schema), {
    instanceOf: UnparseableSearchParamError,
  })
  t.throws(() => parseUrlSearchParams('foo=&foo.bar.a=1', schema), {
    instanceOf: UnparseableSearchParamError,
  })
})

test('cannot parse conflicting record keys', (t) => {
  const schema = z.object({ foo: z.record(z.string(), z.number()) })
  t.throws(() => parseUrlSearchParams('foo=&foo.a=1', schema), {
    instanceOf: UnparseableSearchParamError,
  })
})

test('cannot parse nested params inside a record', (t) => {
  const schema = z.object({ foo: z.record(z.string(), z.number()) })
  t.throws(() => parseUrlSearchParams('foo.a.b=1', schema), {
    instanceOf: UnparseableSearchParamError,
  })
  // In strict mode, a[] is a literal record key,
  // but in generous mode it is the unsupported bracket array format.
  t.throws(() => parseUrlSearchParams('foo.a[]=1', schema, { strict: false }), {
    instanceOf: UnparseableSearchParamError,
  })
})

test('cannot parse repeated values for a non-array param', (t) => {
  t.throws(
    () => parseUrlSearchParams('foo=a&foo=b', z.object({ foo: z.string() })),
    { instanceOf: UnparseableSearchParamError },
  )
  t.throws(
    () => parseUrlSearchParams('foo=1&foo=2', z.object({ foo: z.number() })),
    { instanceOf: UnparseableSearchParamError },
  )
  t.throws(
    () =>
      parseUrlSearchParams(
        'foo.a=1&foo.a=2',
        z.object({ foo: z.record(z.string(), z.number()) }),
      ),
    { instanceOf: UnparseableSearchParamError },
  )
  t.throws(
    () =>
      parseUrlSearchParams(
        'foo=&foo=',
        z.object({ foo: z.object({ bar: z.string() }) }),
      ),
    { instanceOf: UnparseableSearchParamError },
  )
  t.throws(
    () =>
      parseUrlSearchParams(
        'foo=&foo=',
        z.object({ foo: z.record(z.string(), z.string()) }),
      ),
    { instanceOf: UnparseableSearchParamError },
  )
})

test('parses the empty string as null', (t) => {
  t.deepEqual(parseUrlSearchParams('foo=', z.object({ foo: z.string() })), {
    foo: null,
  })
  t.deepEqual(
    parseUrlSearchParams('foo=', z.object({ foo: z.string().nullable() })),
    { foo: null },
  )
})

test('parses params for schemas wrapped in optional, nullable, and default', (t) => {
  t.deepEqual(
    parseUrlSearchParams(
      'foo=1&bar=2&baz=3',
      z.object({
        foo: z.number().optional(),
        bar: z.number().nullable(),
        baz: z.number().default(0),
      }),
    ),
    { foo: 1, bar: 2, baz: 3 },
  )
  t.deepEqual(
    parseUrlSearchParams(
      'foo.bar=a',
      z.object({ foo: z.object({ bar: z.string() }).optional() }).optional(),
    ),
    { foo: { bar: 'a' } },
  )
})

test('parses params for union schemas', (t) => {
  const schema = z.union([
    z.object({ type: z.literal('a'), value: z.number() }),
    z.object({ type: z.literal('b'), other: z.string() }),
  ])
  t.deepEqual(parseUrlSearchParams('type=a&value=1', schema), {
    type: 'a',
    value: 1,
  })
  t.deepEqual(parseUrlSearchParams('type=b&other=c', schema), {
    type: 'b',
    other: 'c',
  })
})

test('parses params for discriminated union schemas', (t) => {
  const schema = z.discriminatedUnion('type', [
    z.object({ type: z.literal('a'), value: z.number() }),
    z.object({ type: z.literal('b'), value: z.number() }),
  ])
  t.deepEqual(parseUrlSearchParams('type=a&value=1', schema), {
    type: 'a',
    value: 1,
  })
})

test('parses record params', (t) => {
  t.deepEqual(
    parseUrlSearchParams(
      'foo.a=1&foo.b=2',
      z.object({ foo: z.record(z.string(), z.number()) }),
    ),
    { foo: { a: 1, b: 2 } },
  )
  t.deepEqual(
    parseUrlSearchParams(
      'foo.a=x&foo.b=',
      z.object({ foo: z.record(z.string(), z.string().nullable()) }),
    ),
    { foo: { a: 'x', b: null } },
  )
})

test('parses union record value types as strings', (t) => {
  t.deepEqual(
    parseUrlSearchParams(
      'foo.a=1&foo.b=x',
      z.object({
        foo: z.record(z.string(), z.union([z.string(), z.number()])),
      }),
    ),
    { foo: { a: '1', b: 'x' } },
  )
})
