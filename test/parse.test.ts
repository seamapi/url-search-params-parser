import { serializeUrlSearchParams } from '@seamapi/url-search-params-serializer'
import test from 'ava'
import { z } from 'zod'

import { parseUrlSearchParams } from '@seamapi/url-search-params-parser'

test('parses empty params', (t) => {
  const schema = z.object({ foo: z.string() })
  const input = {}
  t.deepEqual(
    parseUrlSearchParams(serializeUrlSearchParams(input), schema),
    input,
  )
})
