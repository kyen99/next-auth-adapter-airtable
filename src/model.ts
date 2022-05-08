import {
  AdapterSession,
  AdapterUser,
  VerificationToken,
} from 'next-auth/adapters'
import Airtable, { Table, FieldSet } from 'airtable'

export interface AirtableOptions {
  apiKey: string // The apikey from your account page in Airtable
  baseId: string // e.g. https://airtable.com/baseId/something/somethingelse
}

interface AirtableSession {
  id: string
  sessionToken: string
  userId: string
  expires: string
}

interface AirtableVerification extends VerificationToken {
  id: string
}

interface Provider {
  provider: string
  providerAccountId: string
}

export default function AirtableModel({ apiKey, baseId }: AirtableOptions) {
  if (!apiKey || !baseId) throw Error('Missing apiKey or baseId')
  const airtable = new Airtable({ apiKey })
  const base = airtable.base(baseId)
  const accountTable = base.table('Account')
  const userTable = base.table('User')
  const sessionTable = base.table('Session')
  const verificationTable = base.table('VerificationToken')

  return {
    getUserById: async (userId: string) =>
      <Promise<AdapterUser | null>>userTable
        .find(userId)
        .then((Record) => Record?.fields)
        .then((user) => {
          if (!user) return null
          const { id, name, email, image, emailVerified } = user
          return {
            id,
            name,
            email,
            image,
            emailVerified: emailVerified
              ? new Date(emailVerified?.toString())
              : null,
          }
        })
        .catch((e) => {
          if (e.error === 'NOT_FOUND') return null
          throw e
        }),

    getUserByEmail: (email: string) => <Promise<AdapterUser | null>>userTable
        .select({ filterByFormula: `{email}='${email}'` })
        .all()
        .then((Records) => Records[0]?.fields || null)
        .then((user) => {
          if (!user) return null
          const { id, name, image, emailVerified } = user
          return {
            id,
            name,
            email,
            image,
            emailVerified: emailVerified
              ? new Date(emailVerified.toString())
              : null,
          }
        }),

    getSessionBySessionToken: getSessionBySessionToken(sessionTable),

    getAccountByProvider: async ({ providerAccountId, provider }: Provider) =>
      accountTable
        .select({
          filterByFormula: `AND({providerAccountId}='${providerAccountId}', {provider}='${provider}')`,
        })
        .all()
        .then((Records) => Records[0]?.fields),

    getVerificationTokenByIdentifierAndToken: ({
      identifier,
      token,
    }: Omit<VerificationToken, 'expires'>) => {
      return <Promise<AirtableVerification | null>>verificationTable
        .select({
          filterByFormula: `AND({token}='${token}', {identifier}='${identifier}')`,
        })
        .all()
        .then((Records) => Records[0]?.fields)
    },

    insertUser: async ({ name, email, image, emailVerified }: AdapterUser) => {
      const userFields = {
        name: name?.toString(),
        email: email?.toString(),
        image: image?.toString(),
        emailVerified: emailVerified?.toISOString(),
      }

      return <Promise<AdapterUser>>userTable
        .create(userFields)
        .then((Record) => Record?.fields)
        .then((user) => {
          return {
            id: user.id,
            name: user.name,
            email: user.email,
            image: user.image,
            emailVerified: user.emailVerified
              ? new Date(user.emailVerified.toString())
              : null,
          }
        })
    },

    updateUser: async (user: Partial<AdapterUser>) => {
      const { id, ...userFields } = user
      if (!id) return null
      return <Promise<AdapterUser>>(
        userTable
          .update(id, <Partial<FieldSet>>userFields)
          .then((Record) => Record?.fields)
      )
    },

    deleteUser: async (userId: string) => {
      if (!userId) return null
      const userSessionIds = await sessionTable
        .select({ filterByFormula: `{userId}='${userId}'` })
        .all()
        .then((Records) => Records.map((Record) => Record.id))
      await sessionTable.destroy(userSessionIds)
      const userAccountIds = await accountTable
        .select({ filterByFormula: `{userId}='${userId}'` })
        .all()
        .then((Records) => Records.map((Record) => Record.id))
      await accountTable.destroy(userAccountIds)
      await userTable
        .destroy(userId)
        .then((fields) => ({ ...fields, Account: undefined }))
    },

    createAccount: async (account: any) => {
      const accountFields = { ...account, userId: [account.userId] }
      return accountTable
        .create([{ fields: accountFields }])
        .then((Records) => Records[0].fields)
    },

    deleteAccount: async (accountId: string) => {
      await accountTable.destroy(accountId)
      return null
    },

    createSession: async ({
      sessionToken,
      userId,
      expires,
    }: Omit<AdapterSession, 'id'>) => {
      const sessionFields = {
        sessionToken,
        userId: [userId],
        expires: expires.toISOString(),
      }
      return <Promise<AdapterSession>>sessionTable
        .create([{ fields: sessionFields }])
        .then((Records) => Records[0].fields)
        .then((fields) => ({
          ...fields,
          userId: userId[0],
          expires: new Date(expires),
        }))
    },

    updateSession: async (newSession: Partial<AdapterSession>) => {
      const { sessionToken } = newSession
      if (!sessionToken) return null
      const session = await getSessionBySessionToken(sessionTable)(sessionToken)
      if (!session?.id) return null
      return <Promise<AirtableSession | null>>sessionTable
        .update(session.id, {
          ...newSession,
          expires: newSession.expires?.toISOString(),
        })
        .then((Record) => Record.fields)
        .catch((_e) => null)
    },

    getSession: (sessionId: string) =>
      <Promise<AdapterSession | null>>sessionTable
        .find(sessionId)
        .then((Record) => Record?.fields)
        .then((fields) => {
          if (!fields || !fields.expires) return null
          return {
            sessionToken: fields.sessionToken,
            userId: Array.isArray(fields.userId)
              ? fields?.userId[0]
              : fields.userId,
            expires: new Date(fields.expires.toString()),
          }
        })
        .catch((e) => {
          if (e.error === 'NOT_FOUND') return null
          throw e
        }),

    deleteSession: (sessionId: string) => sessionTable.destroy(sessionId),

    deleteVerification: async (verificationId: string) =>
      verificationTable.destroy(verificationId),

    createVerification: async (data: any) =>
      <Promise<VerificationToken>>(
        verificationTable
          .create([
            { fields: { ...data, expires: data.expires.toISOString() } },
          ])
          .then((Records) => Records[0]?.fields)
      ),
  }
}

const getSessionBySessionToken =
  (sessionTable: Table<any>) => (sessionToken: string) =>
    <Promise<AdapterSession | null>>sessionTable
      .select({ filterByFormula: `{sessionToken} = '${sessionToken}'` })
      .all()
      .then((Records) => Records[0]?.fields)
      .then((fields) => {
        if (!fields) return null
        return {
          ...fields,
          userId: fields.userId[0],
          expires: new Date(fields.expires),
        }
      })
