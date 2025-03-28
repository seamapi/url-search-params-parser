import test from 'ava'
import { z } from 'zod'

import { parseUrlSearchParams } from '@seamapi/url-search-params-parser'

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

// e.g., foo.bar= would conflict with foo.bar.a= or foo.bar.b=2
// since this would be a null object containing values (null is still a value).
test.todo('cannot parse conflicting object keys')
