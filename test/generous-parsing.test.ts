import test from 'ava'
import { z, type ZodSchema } from 'zod'

import {
  parseUrlSearchParams,
  UnparseableSearchParamError,
} from '@seamapi/url-search-params-parser'

// Generous parsing must be enabled with strict: false.
const parse = (query: string, schema: ZodSchema): unknown =>
  parseUrlSearchParams(query, schema, { strict: false })

const parseEmptyOrWhitespace = test.macro({
  title(providedTitle) {
    return `parses empty or whitespace ${providedTitle} params as null`
  },
  exec(t, type: ZodSchema) {
    const schema = z.object({ foo: type })
    const expected = { foo: null }
    t.deepEqual(parse('foo=', schema), expected)
    t.deepEqual(parse('foo= ', schema), expected)
    t.deepEqual(parse('foo=  ', schema), expected)
    t.deepEqual(parse('foo=%20', schema), expected)
    t.deepEqual(parse('foo=%20%20%20', schema), expected)
    t.deepEqual(parse('foo=+', schema), expected)
    t.deepEqual(parse('foo=+++', schema), expected)
    t.deepEqual(parse('foo= %20 ++ +%20 ', schema), expected)
  },
})

test('number', parseEmptyOrWhitespace, z.number())
test('boolean', parseEmptyOrWhitespace, z.boolean())
test('date', parseEmptyOrWhitespace, z.date())
test('object', parseEmptyOrWhitespace, z.object({ bar: z.string() }))
test('record', parseEmptyOrWhitespace, z.record(z.string(), z.string()))

const trimBeforeParsing = test.macro({
  title(providedTitle) {
    return `trims whitespace before parsing ${providedTitle} params`
  },
  exec(t, type: ZodSchema, value: string, expected: unknown) {
    const schema = z.object({ foo: type })
    t.deepEqual(parse(`foo=${value}`, schema), { foo: expected })
    t.deepEqual(parse(`foo= ${value}`, schema), {
      foo: expected,
    })
    t.deepEqual(parse(`foo=${value} `, schema), {
      foo: expected,
    })
    t.deepEqual(parse(`foo=  ${value}  `, schema), {
      foo: expected,
    })
    t.deepEqual(parse(`foo=%20${value}%20`, schema), {
      foo: expected,
    })
    t.deepEqual(parse(`foo=+++${value}+++`, schema), {
      foo: expected,
    })
  },
})

test('number', trimBeforeParsing, z.number(), '2', 2)
test('boolean', trimBeforeParsing, z.boolean(), 'true', true)
test(
  'date',
  trimBeforeParsing,
  z.date(),
  '1970-01-01T00:00:00.000Z',
  new Date(0),
)

test('does not trim whitespace before parsing string params', (t) => {
  const schema = z.object({ foo: z.string() })
  t.deepEqual(parse('foo=+bar+', schema), { foo: ' bar ' })
  t.deepEqual(parse('foo=+', schema), { foo: ' ' })
})

const parseEmptyAsEmptyString = test.macro({
  title(providedTitle) {
    return `parses empty ${providedTitle} params as the empty string`
  },
  exec(t, type: ZodSchema) {
    t.deepEqual(parse('foo=', z.object({ foo: type })), { foo: '' })
  },
})

test('string', parseEmptyAsEmptyString, z.string())
test('optional string', parseEmptyAsEmptyString, z.string().optional())
test('enum', parseEmptyAsEmptyString, z.enum(['a', 'b']))

const parseEmptyAsNull = test.macro({
  title(providedTitle) {
    return `parses empty ${providedTitle} params as null`
  },
  exec(t, type: ZodSchema) {
    t.deepEqual(parse('foo=', z.object({ foo: type })), { foo: null })
  },
})

test('nullable string', parseEmptyAsNull, z.string().nullable())
test('nullish string', parseEmptyAsNull, z.string().nullish())
test(
  'string union with null',
  parseEmptyAsNull,
  z.union([z.string(), z.null()]),
)

test('does not parse whitespace string params as the empty string', (t) => {
  const schema = z.object({ foo: z.string().nullable() })
  t.deepEqual(parse('foo=+', schema), { foo: ' ' })
})

test('parses empty record value params by nullability', (t) => {
  t.deepEqual(
    parse('foo.a=', z.object({ foo: z.record(z.string(), z.string()) })),
    { foo: { a: '' } },
  )
  t.deepEqual(
    parse(
      'foo.a=',
      z.object({ foo: z.record(z.string(), z.string().nullable()) }),
    ),
    { foo: { a: null } },
  )
  t.deepEqual(
    parse(
      'foo.a=',
      z.object({
        foo: z.record(z.string(), z.union([z.string(), z.null()])),
      }),
    ),
    { foo: { a: null } },
  )
  t.deepEqual(
    parse(
      'foo.a=',
      z.object({
        foo: z.record(z.string(), z.union([z.string(), z.boolean(), z.null()])),
      }),
    ),
    { foo: { a: null } },
  )
  t.deepEqual(
    parse(
      'foo.a=',
      z.object({
        foo: z.record(z.string(), z.union([z.string(), z.boolean()])),
      }),
    ),
    { foo: { a: '' } },
  )
})

test('parses additional strings as true', (t) => {
  const schema = z.object({ foo: z.boolean() })
  for (const value of ['true', 'True', 'TRUE', 'yes', 'Yes', 'YES', '1']) {
    t.deepEqual(
      parse(`foo=${value}`, schema),
      { foo: true },
      `parses ${value} as true`,
    )
  }
})

test('parses additional strings as false', (t) => {
  const schema = z.object({ foo: z.boolean() })
  for (const value of ['false', 'False', 'FALSE', 'no', 'No', 'NO', '0']) {
    t.deepEqual(
      parse(`foo=${value}`, schema),
      { foo: false },
      `parses ${value} as false`,
    )
  }
})

const arraySchema = z.object({ foo: z.array(z.string()) })
const numberArraySchema = z.object({ foo: z.array(z.number()) })

test('parses repeated array params like foo=bar&foo=baz', (t) => {
  t.deepEqual(parse('foo=bar&foo=baz', arraySchema), {
    foo: ['bar', 'baz'],
  })
  t.deepEqual(parse('foo=bar', arraySchema), { foo: ['bar'] })
  t.deepEqual(parse('foo=1&foo=2', numberArraySchema), {
    foo: [1, 2],
  })
})

test('parses bracket array params like foo[]=bar&foo[]=baz', (t) => {
  t.deepEqual(parse('foo[]=bar&foo[]=baz', arraySchema), {
    foo: ['bar', 'baz'],
  })
  t.deepEqual(parse('foo[]=bar', arraySchema), { foo: ['bar'] })
  t.deepEqual(parse('foo[]=1&foo[]=2', numberArraySchema), {
    foo: [1, 2],
  })
})

test('parses comma array params like foo=bar,baz', (t) => {
  t.deepEqual(parse('foo=bar,baz', arraySchema), {
    foo: ['bar', 'baz'],
  })
  t.deepEqual(parse('foo=1,2', numberArraySchema), {
    foo: [1, 2],
  })
})

test('parses empty or whitespace array params as empty', (t) => {
  const expected = { foo: [] }
  t.deepEqual(parse('foo=', arraySchema), expected)
  t.deepEqual(parse('foo= ', arraySchema), expected)
  t.deepEqual(parse('foo=%20', arraySchema), expected)
  t.deepEqual(parse('foo=+++', arraySchema), expected)
  t.deepEqual(parse('foo[]=', arraySchema), expected)
  t.deepEqual(parse('foo[]=+++', arraySchema), expected)
})

test('cannot parse multiple empty or whitespace array params like foo=&foo=', (t) => {
  t.throws(() => parse('foo=&foo=', arraySchema), {
    instanceOf: UnparseableSearchParamError,
  })
  t.throws(() => parse('foo=+&foo=%20', arraySchema), {
    instanceOf: UnparseableSearchParamError,
  })
  t.throws(() => parse('foo[]=&foo[]=', arraySchema), {
    instanceOf: UnparseableSearchParamError,
  })
})

test('cannot parse mixed empty or whitespace array params like foo=&foo=bar', (t) => {
  t.throws(() => parse('foo=&foo=bar', arraySchema), {
    instanceOf: UnparseableSearchParamError,
  })
  t.throws(() => parse('foo=bar&foo=', arraySchema), {
    instanceOf: UnparseableSearchParamError,
  })
  t.throws(() => parse('foo=bar&foo=+++', arraySchema), {
    instanceOf: UnparseableSearchParamError,
  })
  t.throws(() => parse('foo[]=&foo[]=bar', arraySchema), {
    instanceOf: UnparseableSearchParamError,
  })
  t.throws(() => parse('foo=bar,,baz', arraySchema), {
    instanceOf: UnparseableSearchParamError,
  })
  t.throws(() => parse('foo=bar,', arraySchema), {
    instanceOf: UnparseableSearchParamError,
  })
})

test('cannot parse mixed array params like foo=bar,baz&foo=bar&foo[]=baz', (t) => {
  t.throws(() => parse('foo=bar,baz&foo=bar&foo[]=baz', arraySchema), {
    instanceOf: UnparseableSearchParamError,
  })
  t.throws(() => parse('foo=bar&foo[]=baz', arraySchema), {
    instanceOf: UnparseableSearchParamError,
  })
  t.throws(() => parse('foo=bar,baz&foo[]=fizz', arraySchema), {
    instanceOf: UnparseableSearchParamError,
  })
  t.throws(() => parse('foo=bar,baz&foo=fizz', arraySchema), {
    instanceOf: UnparseableSearchParamError,
  })
})

test('cannot parse array values containing a comma like foo=a,b&foo=b,c', (t) => {
  t.throws(() => parse('foo=a,b&foo=b,c', arraySchema), {
    instanceOf: UnparseableSearchParamError,
  })
})

test('cannot parse array values containing a comma like foo[]=a,b&foo[]=b,c', (t) => {
  t.throws(() => parse('foo[]=a,b&foo[]=b,c', arraySchema), {
    instanceOf: UnparseableSearchParamError,
  })
  t.throws(() => parse('foo[]=a,b', arraySchema), {
    instanceOf: UnparseableSearchParamError,
  })
})
