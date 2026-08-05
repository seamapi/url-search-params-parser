import test from 'ava'
import { z, type ZodSchema } from 'zod'

import {
  parseUrlSearchParams,
  UnparseableSearchParamError,
} from '@seamapi/url-search-params-parser'

const parseEmptyOrWhitespace = test.macro({
  title(providedTitle) {
    return `parses empty or whitespace ${providedTitle} params as null`
  },
  exec(t, type: ZodSchema) {
    const schema = z.object({ foo: type })
    const expected = { foo: null }
    t.deepEqual(parseUrlSearchParams('foo=', schema), expected)
    t.deepEqual(parseUrlSearchParams('foo= ', schema), expected)
    t.deepEqual(parseUrlSearchParams('foo=  ', schema), expected)
    t.deepEqual(parseUrlSearchParams('foo=%20', schema), expected)
    t.deepEqual(parseUrlSearchParams('foo=%20%20%20', schema), expected)
    t.deepEqual(parseUrlSearchParams('foo=+', schema), expected)
    t.deepEqual(parseUrlSearchParams('foo=+++', schema), expected)
    t.deepEqual(parseUrlSearchParams('foo= %20 ++ +%20 ', schema), expected)
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
    t.deepEqual(parseUrlSearchParams(`foo=${value}`, schema), { foo: expected })
    t.deepEqual(parseUrlSearchParams(`foo= ${value}`, schema), {
      foo: expected,
    })
    t.deepEqual(parseUrlSearchParams(`foo=${value} `, schema), {
      foo: expected,
    })
    t.deepEqual(parseUrlSearchParams(`foo=  ${value}  `, schema), {
      foo: expected,
    })
    t.deepEqual(parseUrlSearchParams(`foo=%20${value}%20`, schema), {
      foo: expected,
    })
    t.deepEqual(parseUrlSearchParams(`foo=+++${value}+++`, schema), {
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
  t.deepEqual(parseUrlSearchParams('foo=+bar+', schema), { foo: ' bar ' })
  t.deepEqual(parseUrlSearchParams('foo=+', schema), { foo: ' ' })
})

test('parses additional strings as true', (t) => {
  const schema = z.object({ foo: z.boolean() })
  for (const value of ['true', 'True', 'TRUE', 'yes', 'Yes', 'YES', '1']) {
    t.deepEqual(
      parseUrlSearchParams(`foo=${value}`, schema),
      { foo: true },
      `parses ${value} as true`,
    )
  }
})

test('parses additional strings as false', (t) => {
  const schema = z.object({ foo: z.boolean() })
  for (const value of ['false', 'False', 'FALSE', 'no', 'No', 'NO', '0']) {
    t.deepEqual(
      parseUrlSearchParams(`foo=${value}`, schema),
      { foo: false },
      `parses ${value} as false`,
    )
  }
})

const arraySchema = z.object({ foo: z.array(z.string()) })
const numberArraySchema = z.object({ foo: z.array(z.number()) })

test('parses repeated array params like foo=bar&foo=baz', (t) => {
  t.deepEqual(parseUrlSearchParams('foo=bar&foo=baz', arraySchema), {
    foo: ['bar', 'baz'],
  })
  t.deepEqual(parseUrlSearchParams('foo=bar', arraySchema), { foo: ['bar'] })
  t.deepEqual(parseUrlSearchParams('foo=1&foo=2', numberArraySchema), {
    foo: [1, 2],
  })
})

test('parses bracket array params like foo[]=bar&foo[]=baz', (t) => {
  t.deepEqual(parseUrlSearchParams('foo[]=bar&foo[]=baz', arraySchema), {
    foo: ['bar', 'baz'],
  })
  t.deepEqual(parseUrlSearchParams('foo[]=bar', arraySchema), { foo: ['bar'] })
  t.deepEqual(parseUrlSearchParams('foo[]=1&foo[]=2', numberArraySchema), {
    foo: [1, 2],
  })
})

test('parses comma array params like foo=bar,baz', (t) => {
  t.deepEqual(parseUrlSearchParams('foo=bar,baz', arraySchema), {
    foo: ['bar', 'baz'],
  })
  t.deepEqual(parseUrlSearchParams('foo=1,2', numberArraySchema), {
    foo: [1, 2],
  })
})

test('parses empty or whitespace array params as empty', (t) => {
  const expected = { foo: [] }
  t.deepEqual(parseUrlSearchParams('foo=', arraySchema), expected)
  t.deepEqual(parseUrlSearchParams('foo= ', arraySchema), expected)
  t.deepEqual(parseUrlSearchParams('foo=%20', arraySchema), expected)
  t.deepEqual(parseUrlSearchParams('foo=+++', arraySchema), expected)
  t.deepEqual(parseUrlSearchParams('foo[]=', arraySchema), expected)
  t.deepEqual(parseUrlSearchParams('foo[]=+++', arraySchema), expected)
})

test('cannot parse multiple empty or whitespace array params like foo=&foo=', (t) => {
  t.throws(() => parseUrlSearchParams('foo=&foo=', arraySchema), {
    instanceOf: UnparseableSearchParamError,
  })
  t.throws(() => parseUrlSearchParams('foo=+&foo=%20', arraySchema), {
    instanceOf: UnparseableSearchParamError,
  })
  t.throws(() => parseUrlSearchParams('foo[]=&foo[]=', arraySchema), {
    instanceOf: UnparseableSearchParamError,
  })
})

test('cannot parse mixed empty or whitespace array params like foo=&foo=bar', (t) => {
  t.throws(() => parseUrlSearchParams('foo=&foo=bar', arraySchema), {
    instanceOf: UnparseableSearchParamError,
  })
  t.throws(() => parseUrlSearchParams('foo=bar&foo=', arraySchema), {
    instanceOf: UnparseableSearchParamError,
  })
  t.throws(() => parseUrlSearchParams('foo=bar&foo=+++', arraySchema), {
    instanceOf: UnparseableSearchParamError,
  })
  t.throws(() => parseUrlSearchParams('foo[]=&foo[]=bar', arraySchema), {
    instanceOf: UnparseableSearchParamError,
  })
  t.throws(() => parseUrlSearchParams('foo=bar,,baz', arraySchema), {
    instanceOf: UnparseableSearchParamError,
  })
  t.throws(() => parseUrlSearchParams('foo=bar,', arraySchema), {
    instanceOf: UnparseableSearchParamError,
  })
})

test('cannot parse mixed array params like foo=bar,baz&foo=bar&foo[]=baz', (t) => {
  t.throws(
    () => parseUrlSearchParams('foo=bar,baz&foo=bar&foo[]=baz', arraySchema),
    { instanceOf: UnparseableSearchParamError },
  )
  t.throws(() => parseUrlSearchParams('foo=bar&foo[]=baz', arraySchema), {
    instanceOf: UnparseableSearchParamError,
  })
  t.throws(() => parseUrlSearchParams('foo=bar,baz&foo[]=fizz', arraySchema), {
    instanceOf: UnparseableSearchParamError,
  })
  t.throws(() => parseUrlSearchParams('foo=bar,baz&foo=fizz', arraySchema), {
    instanceOf: UnparseableSearchParamError,
  })
})

test('cannot parse array values containing a comma like foo=a,b&foo=b,c', (t) => {
  t.throws(() => parseUrlSearchParams('foo=a,b&foo=b,c', arraySchema), {
    instanceOf: UnparseableSearchParamError,
  })
})

test('cannot parse array values containing a comma like foo[]=a,b&foo[]=b,c', (t) => {
  t.throws(() => parseUrlSearchParams('foo[]=a,b&foo[]=b,c', arraySchema), {
    instanceOf: UnparseableSearchParamError,
  })
  t.throws(() => parseUrlSearchParams('foo[]=a,b', arraySchema), {
    instanceOf: UnparseableSearchParamError,
  })
})
