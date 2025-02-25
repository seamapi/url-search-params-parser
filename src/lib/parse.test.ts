import test from 'ava'
import { z } from 'zod'

import { parseUrlSearchParams } from './parse.js'

test('parseUrlSearchParams: with string input', (t) => {
  t.deepEqual(
    parseUrlSearchParams(
      'foo=d&bar=2',
      z.object({ foo: z.string().optional(), bar: z.number().optional() }),
    ),
    { foo: 'd', bar: '2' },
  )
})

test('parseUrlSearchParams: with URLSearchParams input', (t) => {
  t.deepEqual(
    parseUrlSearchParams(
      new URLSearchParams('foo=d&bar=2'),
      z.object({ foo: z.string().optional(), bar: z.number().optional() }),
    ),
    { foo: 'd', bar: '2' },
    'with URLSearchParams input',
  )
})
