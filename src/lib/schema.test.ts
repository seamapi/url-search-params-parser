import test from 'ava'
import { z, type ZodTypeAny } from 'zod'

import {
  UnparseableSchemaError,
  type ValueType,
  zodSchemaToParamSchema,
} from './schema.js'

const valueType = test.macro({
  title(providedTitle, _schema: ZodTypeAny, type: ValueType) {
    return `zodSchemaToParamSchema: parses ${providedTitle ?? type} as ${type}`
  },
  exec(t, schema: ZodTypeAny, type: ValueType) {
    t.deepEqual(zodSchemaToParamSchema(z.object({ foo: schema })), {
      foo: type,
    })
  },
})

const unparseable = test.macro({
  title(providedTitle) {
    return `zodSchemaToParamSchema: cannot parse ${providedTitle}`
  },
  exec(t, schema: ZodTypeAny) {
    t.throws(() => zodSchemaToParamSchema(z.object({ foo: schema })), {
      instanceOf: UnparseableSchemaError,
    })
  },
})

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

test('zodSchemaToParamSchema: parses optional top level object schemas', (t) => {
  t.deepEqual(
    zodSchemaToParamSchema(z.object({ foo: z.string() }).optional()),
    {
      foo: 'string',
    },
  )
})

test('zodSchemaToParamSchema: parses top level union of object schemas', (t) => {
  t.deepEqual(
    zodSchemaToParamSchema(
      z.union([
        z.object({ type: z.literal('a'), value: z.number() }),
        z.object({ type: z.literal('b'), other: z.string() }),
      ]),
    ),
    { type: 'string', value: 'number', other: 'string' },
  )
})

test('zodSchemaToParamSchema: parses top level discriminated union schemas', (t) => {
  t.deepEqual(
    zodSchemaToParamSchema(
      z.discriminatedUnion('type', [
        z.object({ type: z.literal('a'), value: z.number() }),
        z.object({ type: z.literal('b'), value: z.number() }),
      ]),
    ),
    { type: 'string', value: 'number' },
  )
})

test('primitives', valueType, z.string(), 'string')
test('numbers', valueType, z.number(), 'number')
test('booleans', valueType, z.boolean(), 'boolean')
test('dates', valueType, z.date(), 'date')
test('nulls', valueType, z.null(), 'null')
test('nevers', valueType, z.never(), 'never')
test('enums', valueType, z.enum(['a', 'b']), 'string')
test('string literals', valueType, z.literal('a'), 'string')
test('number literals', valueType, z.literal(1), 'number')
test('boolean literals', valueType, z.literal(true), 'boolean')

test('optional schemas', valueType, z.string().optional(), 'string')
test('nullable schemas', valueType, z.string().nullable(), 'string')
test('nullish schemas', valueType, z.number().nullish(), 'number')
test('default schemas', valueType, z.number().default(0), 'number')
test('readonly schemas', valueType, z.number().readonly(), 'number')
test(
  'refined schemas',
  valueType,
  z.number().refine((v) => v > 0),
  'number',
)
test(
  'transformed schemas',
  valueType,
  z.number().transform((v) => String(v)),
  'number',
)
test(
  'preprocessed schemas',
  valueType,
  z.preprocess((v) => v, z.number()),
  'number',
)
test('piped schemas', valueType, z.number().pipe(z.number().min(0)), 'number')

test('zodSchemaToParamSchema: parses refined object schemas', (t) => {
  t.deepEqual(
    zodSchemaToParamSchema(
      z.object({ foo: z.string() }).refine((data) => data.foo !== 'a'),
    ),
    {
      foo: 'string',
    },
  )
})

test('string arrays', valueType, z.array(z.string()), 'string_array')
test('number arrays', valueType, z.array(z.number()), 'number_array')
test('date arrays', valueType, z.array(z.date()), 'date_array')
test('enum arrays', valueType, z.array(z.enum(['a', 'b'])), 'string_array')
test(
  'literal union arrays',
  valueType,
  z.array(z.union([z.literal('a'), z.literal('b')])),
  'string_array',
)

test('string records', valueType, z.record(z.string()), 'string_record')
test(
  'number records',
  valueType,
  z.record(z.string(), z.number()),
  'number_record',
)
test(
  'boolean records',
  valueType,
  z.record(z.string(), z.boolean()),
  'boolean_record',
)
test('date records', valueType, z.record(z.string(), z.date()), 'date_record')
test(
  'nullable value records',
  valueType,
  z.record(z.string(), z.number().nullable()),
  'number_record',
)
test(
  'string union value records',
  valueType,
  z.record(z.string(), z.union([z.string(), z.number()])),
  'string_record',
)

test('nullable object schemas', (t) => {
  t.deepEqual(
    zodSchemaToParamSchema(
      z.object({ foo: z.object({ bar: z.string() }).nullable() }),
    ),
    { foo: { bar: 'string' } },
  )
})

test('unions of object schemas', (t) => {
  t.deepEqual(
    zodSchemaToParamSchema(
      z.object({
        foo: z.union([
          z.object({ a: z.string() }),
          z.object({ a: z.string(), b: z.number() }),
        ]),
      }),
    ),
    { foo: { a: 'string', b: 'number' } },
  )
})

test('bigint schemas', unparseable, z.bigint())
test('symbol schemas', unparseable, z.symbol())
test('any schemas', unparseable, z.any())
test('unknown schemas', unparseable, z.unknown())
test('undefined schemas', unparseable, z.undefined())
test('void schemas', unparseable, z.void())
test('map schemas', unparseable, z.map(z.string(), z.string()))
test('set schemas', unparseable, z.set(z.string()))
test('tuple schemas', unparseable, z.tuple([z.string(), z.number()]))
test('bigint literal schemas', unparseable, z.literal(BigInt(1)))
test(
  'intersection schemas',
  unparseable,
  z.intersection(z.object({ a: z.string() }), z.object({ b: z.string() })),
)

test('nullable array schemas', unparseable, z.array(z.string()).nullable())
test('boolean array schemas', unparseable, z.array(z.boolean()))
test('null array schemas', unparseable, z.array(z.null()))
test(
  'nullable value array schemas',
  unparseable,
  z.array(z.string().nullable()),
)
test(
  'optional value array schemas',
  unparseable,
  z.array(z.string().optional()),
)
test('nested array schemas', unparseable, z.array(z.array(z.string())))
test('object array schemas', unparseable, z.array(z.object({ a: z.string() })))
test('record array schemas', unparseable, z.array(z.record(z.string())))
test(
  'mixed union array schemas',
  unparseable,
  z.array(z.union([z.string(), z.number()])),
)

test('number key record schemas', unparseable, z.record(z.number(), z.string()))
test(
  'object value record schemas',
  unparseable,
  z.record(z.string(), z.object({ a: z.string() })),
)
test(
  'array value record schemas',
  unparseable,
  z.record(z.string(), z.array(z.string())),
)
test(
  'record value record schemas',
  unparseable,
  z.record(z.string(), z.record(z.string())),
)
test(
  'non-string union value record schemas',
  unparseable,
  z.record(z.string(), z.union([z.number(), z.boolean()])),
)

test(
  'conflicting union value types',
  unparseable,
  z.union([z.string(), z.number()]),
)
test(
  'unions mixing object and primitive schemas',
  unparseable,
  z.union([z.object({ a: z.string() }), z.string()]),
)
test(
  'unions with conflicting object property types',
  unparseable,
  z.union([z.object({ a: z.string() }), z.object({ a: z.number() })]),
)

test('zodSchemaToParamSchema: cannot parse keys containing a dot', (t) => {
  t.throws(() => zodSchemaToParamSchema(z.object({ 'a.b': z.string() })), {
    instanceOf: UnparseableSchemaError,
  })
})

test('zodSchemaToParamSchema: parses native enum schemas', (t) => {
  enum Strings {
    A = 'a',
    B = 'b',
  }
  t.deepEqual(
    zodSchemaToParamSchema(z.object({ foo: z.nativeEnum(Strings) })),
    {
      foo: 'string',
    },
  )

  enum Numbers {
    A = 1,
    B = 2,
  }
  t.deepEqual(
    zodSchemaToParamSchema(z.object({ foo: z.nativeEnum(Numbers) })),
    {
      foo: 'number',
    },
  )

  enum Mixed {
    A = 'a',
    B = 2,
  }
  t.throws(
    () => zodSchemaToParamSchema(z.object({ foo: z.nativeEnum(Mixed) })),
    {
      instanceOf: UnparseableSchemaError,
    },
  )
})
