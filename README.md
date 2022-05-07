# Airtable Next Auth Adapter

This is a [next-auth](https://next-auth.js.org/) database adapter for [Airtable](https://airtable.com)

## Status

This is experimental. Use at your own risk. I've tested this with Google and Email providers. If you run across a configuration that doesn't work, open an issue in Github with your `[...nextauth].js` file.

## Airtable schema

Clone this base in Airtable: https://airtable.com/shr16Xd8glUk90c4P

## ENV vars

Add your apiKey and the baseId of the cloned base to .env:

```
AIRTABLE_API_KEY=keyXXXXXXXXXXXXXX
AIRTABLE_BASE_ID=appXXXXXXXXXXXXXX
```

## Usage

```
import NextAuth from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import AirtableAdapter from 'next-auth-adapter-airtable'

export default NextAuth({
  providers: [
    ...providers
  ],
  adapter: AirtableAdapter({
    apiKey: process.env.AIRTABLE_API_KEY || '',
    baseId: process.env.AIRTABLE_BASE_ID || '',
  }),
})

```
