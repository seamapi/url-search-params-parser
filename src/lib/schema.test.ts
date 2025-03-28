import test from 'ava'
import { z } from 'zod'

import { UnparseableSchemaError, zodSchemaToParamSchema } from './schema.js'

test('zodSchemaToParamSchema: parses flat object schemas', (t) => {
  t.deepEqual(zodSchemaToParamSchema(z.object({ foo: z.string() })), {
    foo: 'string',
  })
  t.deepEqual(
    zodSchemaToParamSchema(
      z.object({
        a: z.string(),
        b: z.number(),
        c: z.boolean(),
        d: z.array(z.string()),
      }),
    ),
    {
      a: 'string',
      b: 'number',
      c: 'boolean',
      d: 'string_array',
    },
  )
})

test('zodSchemaToParamSchema: parses nested object schemas', (t) => {
  t.deepEqual(zodSchemaToParamSchema(z.object({ foo: z.string() })), {
    foo: 'string',
  })
  t.deepEqual(
    zodSchemaToParamSchema(
      z.object({
        a: z.string(),
        b: z.object({
          c: z.boolean(),
          d: z.array(z.string()),
          e: z.object({
            f: z.boolean(),
          }),
        }),
      }),
    ),
    {
      a: 'string',
      b: {
        c: 'boolean',
        d: 'string_array',
        e: {
          f: 'boolean',
        },
      },
    },
  )
})

test('zodSchemaToParamSchema: cannot parse non-object schemas', (t) => {
  t.throws(() => zodSchemaToParamSchema(z.number()), {
    instanceOf: UnparseableSchemaError,
  })
  t.throws(() => zodSchemaToParamSchema(z.enum(['foo'])), {
    instanceOf: UnparseableSchemaError,
  })
  t.throws(() => zodSchemaToParamSchema(z.string()), {
    instanceOf: UnparseableSchemaError,
  })
  t.throws(() => zodSchemaToParamSchema(z.map(z.string(), z.string())), {
    instanceOf: UnparseableSchemaError,
  })
  t.throws(() => zodSchemaToParamSchema(z.array(z.string())), {
    instanceOf: UnparseableSchemaError,
  })
  t.throws(() => zodSchemaToParamSchema(z.null()), {
    instanceOf: UnparseableSchemaError,
  })
  t.throws(() => zodSchemaToParamSchema(z.union([z.number(), z.string()])), {
    instanceOf: UnparseableSchemaError,
  })
})
