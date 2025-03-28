import {
  type Params,
  serializeUrlSearchParams,
} from '@seamapi/url-search-params-serializer'
import test from 'ava'
import { z, type ZodSchema } from 'zod'

import { parseUrlSearchParams } from '@seamapi/url-search-params-parser'

const parses = test.macro({
  title(providedTitle) {
    return `parses ${providedTitle}`
  },
  exec(t, input: Params, schema: ZodSchema) {
    t.deepEqual(
      parseUrlSearchParams(serializeUrlSearchParams(input), schema),
      input,
    )
  },
})

test(
  'empty params',
  parses,
  {
    foo: undefined,
  },
  z.object({ foo: z.string() }),
)

test(
  'nested params',
  parses,
  {
    foo: 'a',
    bar: { baz: 'b' },
  },
  z.object({
    foo: z.string(),
    bar: z.object({ baz: z.string() }),
  }),
)
