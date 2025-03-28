import test from 'ava'
import { z, type ZodSchema } from 'zod'

import { parseUrlSearchParams } from '@seamapi/url-search-params-parser'

const parseEmptyOrWhitespace = test.macro({
  title(providedTitle) {
    return `parses empty or whitespace ${providedTitle} params as null`
  },
  exec(t, type: ZodSchema) {
    const schema = z.object({ foo: type })
    const expected = { foo: null }
    t.deepEqual(parseUrlSearchParams('foo=', schema), expected)
    t.deepEqual(parseUrlSearchParams('foo=%20', schema), expected)
    t.deepEqual(parseUrlSearchParams('foo= %20 ++ +  ', schema), expected)
    t.deepEqual(parseUrlSearchParams('foo=+', schema), expected)
  },
})

test('number', parseEmptyOrWhitespace, z.number())

test.todo('parse empty or whitespace boolean params as null')
test.todo('parse empty or whitespace date params as null')
test.todo('parse empty or whitespace object params as null')
test.todo('parse empty or whitespace record params as null')

test.todo('parse empty or whitespace array params as empty')
test.todo(
  'cannot parse multiple empty or whitespace array params like foo=&foo=',
)
test.todo(
  'cannot parse mixed empty or whitespace array params like foo=&foo=bar',
)

test.todo('parse additional strings as true and false')

test.todo('parse repeated array params like foo=bar&foo=baz')
test.todo('parse bracket array params like foo[]=bar&foo[]=baz')
test.todo('parse comma array params like foo=bar,baz')

test.todo('cannot parse mixed array params like foo=bar,baz&foo=bar&foo[]=baz')
test.todo('cannot parse array values containing a comma like foo=a,b&foo=b,c')
test.todo(
  'cannot parse array values containing a comma like foo[]=a,b&foo[]=b,c',
)
