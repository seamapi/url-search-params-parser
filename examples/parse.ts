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
    a: z.string().optional(),
    b: z.number().optional(),
    c: z.boolean().optional(),
    d: z.string().nullable().optional(),
    e: z.enum(['x', 'y']).optional(),
    f: z.array(z.string()).optional(),
    g: z.array(z.number()).optional(),
    h: z.date().optional(),
    i: z.record(z.string(), z.number()).optional(),
    j: z
      .object({
        foo: z.number().optional(),
        bar: z
          .object({
            baz: z.number().optional(),
            fizz: z.array(z.string()).optional(),
          })
          .optional(),
      })
      .optional(),
  })
  .optional()
