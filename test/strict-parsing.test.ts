import test from 'ava'
import { z } from 'zod'

import {
  parseUrlSearchParams,
  UnparseableSearchParamError,
} from '@seamapi/url-search-params-parser'

// Strict parsing is the default and only parses
// the expected output of the serializer.

const arraySchema = z.object({ foo: z.array(z.string()) })

test('strict: parses repeated array params', (t) => {
  t.deepEqual(parseUrlSearchParams('foo=bar&foo=baz', arraySchema), {
    foo: ['bar', 'baz'],
  })
  t.deepEqual(parseUrlSearchParams('foo=bar', arraySchema), { foo: ['bar'] })
  t.deepEqual(parseUrlSearchParams('foo=', arraySchema), { foo: [] })
})

test('strict: does not split array values containing a comma', (t) => {
  t.deepEqual(parseUrlSearchParams('foo=a,b', arraySchema), { foo: ['a,b'] })
  t.deepEqual(parseUrlSearchParams('foo=a,b&foo=c,d', arraySchema), {
    foo: ['a,b', 'c,d'],
  })
  t.deepEqual(parseUrlSearchParams('foo=a,b&foo=c', arraySchema), {
    foo: ['a,b', 'c'],
  })
})

test('strict: cannot parse the bracket array format', (t) => {
  t.throws(() => parseUrlSearchParams('foo[]=bar', arraySchema), {
    instanceOf: UnparseableSearchParamError,
  })
  t.throws(() => parseUrlSearchParams('foo[]=bar&foo[]=baz', arraySchema), {
    instanceOf: UnparseableSearchParamError,
  })
  t.throws(() => parseUrlSearchParams('foo[]=', arraySchema), {
    instanceOf: UnparseableSearchParamError,
  })
  t.throws(() => parseUrlSearchParams('foo=bar&foo[]=baz', arraySchema), {
    instanceOf: UnparseableSearchParamError,
  })
})

test('strict: cannot parse arrays mixing empty values with other values', (t) => {
  t.throws(() => parseUrlSearchParams('foo=&foo=', arraySchema), {
    instanceOf: UnparseableSearchParamError,
  })
  t.throws(() => parseUrlSearchParams('foo=&foo=bar', arraySchema), {
    instanceOf: UnparseableSearchParamError,
  })
})

test('strict: only parses true and false as booleans', (t) => {
  const schema = z.object({ foo: z.boolean() })
  t.deepEqual(parseUrlSearchParams('foo=true', schema), { foo: true })
  t.deepEqual(parseUrlSearchParams('foo=false', schema), { foo: false })
  for (const value of ['True', 'TRUE', 'yes', '1', 'False', 'NO', '0']) {
    t.deepEqual(
      parseUrlSearchParams(`foo=${value}`, schema),
      { foo: value },
      `passes ${value} through unchanged`,
    )
  }
})

test('strict: does not trim whitespace before parsing', (t) => {
  t.deepEqual(parseUrlSearchParams('foo=+2+', z.object({ foo: z.number() })), {
    foo: ' 2 ',
  })
  t.deepEqual(
    parseUrlSearchParams('foo=+true', z.object({ foo: z.boolean() })),
    { foo: ' true' },
  )
})

test('strict: parses whitespace-only values as whitespace, not null', (t) => {
  t.deepEqual(parseUrlSearchParams('foo=+', z.object({ foo: z.number() })), {
    foo: ' ',
  })
  t.deepEqual(parseUrlSearchParams('foo=%20', z.object({ foo: z.boolean() })), {
    foo: ' ',
  })
  t.deepEqual(parseUrlSearchParams('foo=+', arraySchema), { foo: [' '] })
})

test('strict: parses empty values as null', (t) => {
  t.deepEqual(parseUrlSearchParams('foo=', z.object({ foo: z.number() })), {
    foo: null,
  })
  t.deepEqual(parseUrlSearchParams('foo=', z.object({ foo: z.string() })), {
    foo: null,
  })
  t.deepEqual(
    parseUrlSearchParams(
      'foo=',
      z.object({ foo: z.record(z.string(), z.string()) }),
    ),
    { foo: null },
  )
})

test('strict: record values keep commas and are not trimmed', (t) => {
  t.deepEqual(
    parseUrlSearchParams(
      'foo.a=x,y&foo.b=+z',
      z.object({ foo: z.record(z.string(), z.string()) }),
    ),
    { foo: { a: 'x,y', b: ' z' } },
  )
})
