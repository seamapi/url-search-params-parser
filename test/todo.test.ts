import test from 'ava'

import { todo } from '@seamapi/url-search-params-parser'

test('todo: returns argument', (t) => {
  t.is(todo('todo'), 'todo', 'returns input')
})
