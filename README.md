# URLSearchParams Parser

[![npm](https://img.shields.io/npm/v/@seamapi/url-search-params-parser.svg)](https://www.npmjs.com/package/@seamapi/url-search-params-parser)
[![GitHub Actions](https://github.com/seamapi/url-search-params-parser/actions/workflows/check.yml/badge.svg)](https://github.com/seamapi/url-search-params-parser/actions/workflows/check.yml)

Parses URLSearchParams to JavaScript objects according to Zod schemas.

## Description

The set of allowed Zod schemas is restricted to ensure the parsing is unambiguous.
This parser may be used as a true inverse operation to [@seamapi/url-search-params-serializer][@url-search-params-serializer].

[@url-search-params-serializer]: https://github.com/seamapi/url-search-params-serializer

### Generous Parsing

This parser provides strict compatibility with the serialization format of [@url-search-params-serializer].
However, some additional input cases are handled:

- For `z.number()`, `z.boolean()`, `z.date()`, `z.object()`, and `z.record()`,
  whitespace only values are parsed as `null`.
- For `z.number()`, `z.boolean()`, `z.date()`,
  starting and ending whitespace is trimmed  before parsing.
- For `z.boolean()`, the following values are parsed as `true`:
    -
- For `z.boolean()`, the following values are parsed as `false`:
    -
- Parses `z.array()` in the following formats.
  In order to support unambiguous parsing, array string values
  containing a `,` are not supported.
    - `foo=1&bar=2`
    - `foo[]=1&foo[]=2`
    - `foo=1,2`

### Allowed Zod Schemas

- The top-level schema must be an `z.object()` or `z.union()` of `z.object()`.
- Properties may be a `z.object()` or `z.union()` of objects.
- All union object types must flatten to a parseable object schema with non-conflicting property types.
- Primitive properties must be a `z.string()`, `z.number()`, `z.boolean()` or `z.date()`.
  - Properties must be a single-value type.
  - The primitives `z.bigint()` and `z.symbol()` are not supported.
  - Strings with zero length are not allowed.
    If not specified, a `z.string()` is always assumed to be `z.string().min(1)`.
  - Using `z.enum()` is allowed and equivalent to `z.string()`.
- Any property may be `z.optional()` or `z.never()`.
- No property may `z.void()`, `z.undefined()`, `z.any()`, or `z.unknown()`.
- Any property may be `z.nullable()` except `z.array()`.
- Properties that are `z.literal()` are allowed and must still obey all of these rules.
- A `z.array()` must be of a single value-type.
  - The value-types must obey all the same basic rules
    for primitive object, union, and property types.
  - Value-types may not be `z.nullable()` or `z.undefined()`.
  - The value-type cannot be a `z.object()`.
  - The value-type cannot be an `z.array()` or contain a nested `z.array()` at any level.
- A `z.record()` has less-strict schema constraints but weaker parsing guarantees:
  - They keys must be `z.string()`.
  - The value-type may be a single primitive type.
  - The value-type may be `z.nullable()`.
  - The value-type may not be a `z.record()`, `z.array()`, or `z.object()`.
    This restriction is not strictly necessary,
    but a deliberate choice not to support such schemas in this version.
  - The value-type may be a union of primitive types,
    but this union must include `z.string()` and all values will be parsed as `z.string()`.
    For schemas of this type, the parser is no longer a true inverse of the serialization.

## Installation

Add this as a dependency to your project using [npm] with

```
$ npm install @seamapi/url-search-params-parser
```

[npm]: https://www.npmjs.com/

## Usage

```ts
import { parseUrlSearchParams } from '@seamapi/url-search-params-parser'

parseUrlSearchParams(
  'age=27&isAdmin=true&name=Dax&tags=cars&tags=planes',
  z.object({
    name: z.string().min(1),
    age: z.number(),
    isAdmin: z.boolean(),
    tags: z.array(z.string()),
  }),
) // => { name: 'Dax', age: 27, isAdmin: true, tags: ['cars', 'planes'] }
```

## Development and Testing

### Quickstart

```
$ git clone https://github.com/seamapi/url-search-params-parser.git
$ cd url-search-params-parser
$ nvm install
$ npm install
$ npm run test:watch
```

Primary development tasks are defined under `scripts` in `package.json`
and available via `npm run`.
View them with

```
$ npm run
```

### Source code

The [source code] is hosted on GitHub.
Clone the project with

```
$ git clone git@github.com:seamapi/url-search-params-parser.git
```

[source code]: https://github.com/seamapi/url-search-params-parser

### Requirements

You will need [Node.js] with [npm] and a [Node.js debugging] client.

Be sure that all commands run under the correct Node version, e.g.,
if using [nvm], install the correct version with

```
$ nvm install
```

Set the active version for each shell session with

```
$ nvm use
```

Install the development dependencies with

```
$ npm install
```

[Node.js]: https://nodejs.org/
[Node.js debugging]: https://nodejs.org/en/docs/guides/debugging-getting-started/
[npm]: https://www.npmjs.com/
[nvm]: https://github.com/creationix/nvm

### Publishing

#### Automatic

New versions are released automatically with [semantic-release]
as long as commits follow the [Angular Commit Message Conventions].

[Angular Commit Message Conventions]: https://semantic-release.gitbook.io/semantic-release/#commit-message-format
[semantic-release]: https://semantic-release.gitbook.io/

#### Manual

Publish a new version by triggering a [version workflow_dispatch on GitHub Actions].
The `version` input will be passed as the first argument to [npm-version].

This may be done on the web or using the [GitHub CLI] with

```
$ gh workflow run version.yml --raw-field version=<version>
```

[GitHub CLI]: https://cli.github.com/
[npm-version]: https://docs.npmjs.com/cli/version
[version workflow_dispatch on GitHub Actions]: https://github.com/seamapi/url-search-params-parser/actions?query=workflow%3Aversion

## GitHub Actions

_GitHub Actions should already be configured: this section is for reference only._

The following repository secrets must be set on [GitHub Actions]:

- `NPM_TOKEN`: npm token for installing and publishing packages.
- `GH_TOKEN`: A personal access token for the bot user with
  `packages:write` and `contents:write` permission.
- `GIT_USER_NAME`: The GitHub bot user's real name.
- `GIT_USER_EMAIL`: The GitHub bot user's email.
- `GPG_PRIVATE_KEY`: The GitHub bot user's [GPG private key].
- `GPG_PASSPHRASE`: The GitHub bot user's GPG passphrase.

[GitHub Actions]: https://github.com/features/actions
[GPG private key]: https://github.com/marketplace/actions/import-gpg#prerequisites

## Contributing

> If using squash merge, edit and ensure the commit message follows the [Angular Commit Message Conventions] specification.
> Otherwise, each individual commit must follow the [Angular Commit Message Conventions] specification.

1. Create your feature branch (`git checkout -b my-new-feature`).
2. Make changes.
3. Commit your changes (`git commit -am 'Add some feature'`).
4. Push to the branch (`git push origin my-new-feature`).
5. Create a new draft pull request.
6. Ensure all checks pass.
7. Mark your pull request ready for review.
8. Wait for the required approval from the code owners.
9. Merge when ready.

[Angular Commit Message Conventions]: https://semantic-release.gitbook.io/semantic-release/#commit-message-format

## License

This npm package is licensed under the MIT license.

## Warranty

This software is provided by the copyright holders and contributors "as is" and
any express or implied warranties, including, but not limited to, the implied
warranties of merchantability and fitness for a particular purpose are
disclaimed. In no event shall the copyright holder or contributors be liable for
any direct, indirect, incidental, special, exemplary, or consequential damages
(including, but not limited to, procurement of substitute goods or services;
loss of use, data, or profits; or business interruption) however caused and on
any theory of liability, whether in contract, strict liability, or tort
(including negligence or otherwise) arising in any way out of the use of this
software, even if advised of the possibility of such damage.
