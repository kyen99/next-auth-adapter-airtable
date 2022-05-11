# Airtable Next Auth Adapter

This is a [next-auth](https://next-auth.js.org/) database adapter for [Airtable](https://airtable.com)

## Status

This is experimental. Use at your own risk. I've tested this with Google and Email providers. If you run across a configuration that doesn't work, open an issue [here](https://github.com/kyen99/next-auth-adapter-airtable/issues) with your `[...nextauth].js` file.

There is test coverage using the standard basic-tests.ts set used for the adapters in the official repo.

## TODO

- Use returned record object to destroy items rather than table.destroy where possible
- Make objects returned from airtable lookups always match adapter objects

## Airtable schema

Clone this base in Airtable: https://airtable.com/shr16Xd8glUk90c4P

## ENV vars

Add your apiKey and the baseId of the cloned base to .env:

```
AIRTABLE_API_KEY=keyXXXXXXXXXXXXXX // From your account page
AIRTABLE_BASE_ID=appXXXXXXXXXXXXXX // e.g. https://airtable.com/baseId/something/somethingelse/
```

## Usage

```
import NextAuth from 'next-auth'
import AirtableAdapter from 'next-auth-adapter-airtable'

export default NextAuth({
  providers: [
    ...providers
  ],
  adapter: AirtableAdapter({
    apiKey: process.env.AIRTABLE_API_KEY,
    baseId: process.env.AIRTABLE_BASE_ID,
  }),
})

```
