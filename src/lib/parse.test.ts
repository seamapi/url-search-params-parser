import test from 'ava'
import { z } from 'zod'

import { parseUrlSearchParams } from './parse.js'
import { UnparseableSchemaError } from './schema.js'

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

test('parseUrlSearchParams: with a leading question mark', (t) => {
  t.deepEqual(
    parseUrlSearchParams('?foo=d', z.object({ foo: z.string().optional() })),
    { foo: 'd' },
  )
})

test('parseUrlSearchParams: parses the documented usage example', (t) => {
  t.deepEqual(
    parseUrlSearchParams(
      'age=27&isAdmin=true&name=Dax&tags=cars&tags=planes',
      z.object({
        name: z.string().min(1),
        age: z.number(),
        isAdmin: z.boolean(),
        tags: z.array(z.string()),
      }),
    ),
    { name: 'Dax', age: 27, isAdmin: true, tags: ['cars', 'planes'] },
  )
})

test('parseUrlSearchParams: with an unparseable schema', (t) => {
  t.throws(() => parseUrlSearchParams('foo=d', z.string()), {
    instanceOf: UnparseableSchemaError,
  })
  t.throws(() => parseUrlSearchParams('foo=d', z.array(z.string())), {
    instanceOf: UnparseableSchemaError,
  })
})
