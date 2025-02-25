import type { Builder, Command, Describe, Handler } from 'landlubber'
import { z } from 'zod'

import { parseUrlSearchParams } from '@seamapi/url-search-params-parser'

interface Options {
  query: string
}

export const command: Command = 'parse query'

export const describe: Describe = 'Parse query'

export const builder: Builder = {
  query: {
    type: 'string',
    describe: 'Query string',
  },
}

export const handler: Handler<Options> = async ({ query, logger }) => {
  logger.info({ data: parseUrlSearchParams(query, schema) }, 'params')
}

const schema = z
  .object({
    a: z.string(),
    b: z.number(),
    c: z.boolean(),
    d: z.null(),
    e: z.array(z.union([z.string(), z.number()])),
    f: z.array(z.string()),
    g: z.date(),
    h: z.date(),
    i: z
      .object({
        foo: z.number(),
        bar: z
          .object({
            baz: z.number(),
            fizz: z.array(z.union([z.string(), z.number()])),
          })
          .optional(),
      })
      .optional(),
  })
  .optional()
