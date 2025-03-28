import test from 'ava'
import { z } from 'zod'

import { parseUrlSearchParams } from './parse.js'

test('parseUrlSearchParams: with string input', (t) => {
  t.deepEqual(
    parseUrlSearchParams(
      'foo=d&bar=2',
      z.object({ foo: z.string().optional(), bar: z.number().optional() }),
    ),
    { foo: 'd', bar: 2 },
  )
})

test('parseUrlSearchParams: with URLSearchParams input', (t) => {
  t.deepEqual(
    parseUrlSearchParams(
      new URLSearchParams('foo=d&bar=2'),
      z.object({ foo: z.string().optional(), bar: z.number().optional() }),
    ),
    { foo: 'd', bar: 2 },
    'with URLSearchParams input',
  )
})

test.todo('parse repeated array params like foo=bar&foo=baz')
test.todo('parse bracket array params like foo[]=bar&foo[]=baz')
test.todo('parse comma array params like foo=bar,baz')

test.todo('cannot parse mixed array params like foo=bar,baz&foo=bar&foo[]=baz')

// e.g., foo.bar= would conflict with foo.bar.a= or foo.bar.b=2
// since this would be a null object containing values (null is still a value).
test.todo('cannot parse conflicting object keys')
