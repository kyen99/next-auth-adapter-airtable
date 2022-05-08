import { runBasicTests } from './basic-tests'
import AirtableAdapter from '../src/index'
import Airtable from 'airtable'
import dotenv from 'dotenv'
dotenv.config()

/*

  To run the tests you need to:
   - clone this base: https://airtable.com/shr16Xd8glUk90c4P
   - add your api key and base id in .env

  Tests fail occasionally (10 fail, 7 pass). I think that if you look up
  a newly created record in Airtable too fast, it's not there. I double
  checked that there is nowhere a record is created that isn't either
  awaited or the promise returned.

*/

const apiKey = process.env.AIRTABLE_API_KEY
const baseId = process.env.AIRTABLE_BASE_ID

const airtable = new Airtable({ apiKey })
const base = airtable.base(baseId)
const userTable = base.table('User')
const accountTable = base.table('Account')
const sessionTable = base.table('Session')
const verificationTable = base.table('VerificationToken')

runBasicTests({
  adapter: AirtableAdapter({ apiKey, baseId }),
  db: {
    id: () => 'recgGUeAtrecuMhUz',
    connect: async () => {
      emptyDb()
    },
    disconnect: async () => {
      emptyDb()
    },
    verificationToken: ({ identifier, token }) => {
      return verificationTable
        .select({
          filterByFormula: `AND({identifier}='${identifier}', {token}='${token}')`,
        })
        .firstPage()
        .then((records) => records[0].fields)
        .then((fields) => ({
          token: fields.token,
          identifier: fields.identifier,
          expires: new Date(fields.expires.toString()),
        }))
    },
    user: (id) => {
      return userTable
        .find(id)
        .then((record) => record.fields)
        .then((fields) => {
          return {
            id,
            name: fields.name,
            email: fields.email,
            image: fields.image,
            emailVerified: new Date(fields.emailVerified.toString()),
          }
        })
        .catch(() => null) // Airtable throws an error when find fails
    },
    account: ({ provider, providerAccountId }) =>
      accountTable
        .select({
          filterByFormula: `AND({provider}='${provider}', {providerAccountId}='${providerAccountId}')`,
        })
        .all()
        .then((records) => records[0]?.fields)
        .then((fields) => {
          if (!fields) return null
          return {
            ...fields,
            userId: Array.isArray(fields.userId)
              ? fields?.userId[0]
              : fields.userId || null,
          }
        }),
    session: (sessionToken) =>
      sessionTable
        .select({ filterByFormula: `{sessionToken}='${sessionToken}'` })
        .all()
        .then((records) => records[0]?.fields)
        .then((fields) => {
          if (!fields) return null
          return {
            ...fields,
            expires: new Date(fields.expires.toString()),
            userId: Array.isArray(fields.userId)
              ? fields?.userId[0]
              : fields.userId || null,
          }
        }),
  },
})

const emptyDb = async () => {
  ;[userTable, accountTable, sessionTable, verificationTable].forEach(
    async (table) => {
      const ids = await getAllRecords(table)
      ids.length && deleteRecords(table, ids)
    }
  )
}

const getAllRecords = async (table) =>
  table
    .select()
    .all()
    .then((records) => records.map((record) => record.id))

const deleteRecords = async (table, ids) => table.destroy(ids)
