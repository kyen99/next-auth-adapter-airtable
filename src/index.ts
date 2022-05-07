import {
  Adapter,
  AdapterSession,
  AdapterUser,
  VerificationToken,
} from 'next-auth/adapters'
import Airtable, { FieldSet } from 'airtable'

interface AirtableOptions {
  apiKey: string
  baseId: string
}

export default function AirtableAdapter(options: AirtableOptions): Adapter {
  const { apiKey, baseId } = options
  Airtable.configure({ apiKey })

  const airtable = new Airtable()
  const base = airtable.base(baseId)
  const userTable = base.table('User')
  const accountTable = base.table('Account')
  const sessionTable = base.table('Session')
  const verificationTable = base.table('VerificationToken')

  async function getUserById(userId: string) {
    return <Promise<AdapterUser>>(
      userTable.find(userId).then((Record) => Record.fields)
    )
  }

  async function getSessionBySessionToken(
    sessionToken: string
  ): Promise<AdapterSession> {
    return <Promise<AdapterSession>>sessionTable
      .select({ filterByFormula: `{sessionToken} = '${sessionToken}'` })
      .all()
      .then((Records) => (Records.length ? Records[0].fields : null))
      .then((fields) => {
        if (!fields) return null
        const userId = Array.isArray(fields.userId)
          ? fields.userId[0]
          : fields.userId
        return { ...fields, userId }
      })
  }

  async function getAccountByProvider({
    providerAccountId,
    provider,
  }: {
    providerAccountId: string
    provider: string
  }) {
    console.log('getAccountByProvider')
    return accountTable
      .select({
        filterByFormula: `AND({providerAccountId}='${providerAccountId}', {provider}='${provider}')`,
      })
      .all()
      .then((Records) => (Records.length > 0 ? Records[0].fields : {}))
  }

  async function getVerificationTokenByIdentifierAndToken({
    identifier,
    token,
  }: {
    identifier: string
    token: string
  }) {
    console.log('getVerificationTokenbyIdentifierAndToken', identifier, token)
    return <Promise<VerificationToken & { id?: string }>>verificationTable
      .select({
        filterByFormula: `AND({token}='${token}', {identifier}='${identifier}')`,
      })
      .all()
      .then((Records) => (Records.length ? Records[0].fields : null))
  }

  return {
    async createUser(user: any) {
      return <Promise<AdapterUser>>(
        userTable
          .create([{ fields: user }])
          .then((Records) => Records[0].fields)
      )
    },

    async getUser(id) {
      return getUserById(id)
    },

    async getUserByEmail(email) {
      return <Promise<AdapterUser>>userTable
        .select({ filterByFormula: `{email}='${email}'` })
        .all()
        .then((Records) => Records[0].fields)
    },

    async getUserByAccount({ providerAccountId, provider }) {
      const { userId } = await getAccountByProvider({
        providerAccountId,
        provider,
      })

      if (!userId) return null

      return <Promise<AdapterUser>>(
        userTable.find(userId.toString()).then((record) => record.fields)
      )
    },

    async updateUser(user) {
      const { id, ...userFields } = user
      if (!id)
        throw Error('Cannot update user. User id does not exist in user table')
      await userTable.update(id, <Partial<FieldSet>>userFields)
      return getUserById(id)
    },

    async deleteUser(userId) {
      await userTable.destroy(userId)
    },

    async linkAccount(account) {
      const accountFields = { ...account, userId: [account.userId] }
      await accountTable.create(accountFields)
    },

    async unlinkAccount({ providerAccountId, provider }) {
      const account = await getAccountByProvider({
        providerAccountId,
        provider,
      })
      const { id } = account
      if (!id) throw Error('Could not unlink account.')
      accountTable.destroy(id.toString())
    },

    async createSession({ sessionToken, userId, expires }) {
      const sessionFields = {
        sessionToken,
        expires: expires.toISOString(),
        userId: [userId],
      }
      return <Promise<AdapterSession>>sessionTable
        .create(sessionFields)
        .then((Record) => Record.fields)
        .then((fields) => ({ ...fields, expires: new Date(expires) }))
    },

    async getSessionAndUser(sessionToken) {
      const session = await getSessionBySessionToken(sessionToken)
      if (!session) return null

      const user = await getUserById(session.userId)

      return {
        session: {
          ...session,
          expires: new Date(session.expires),
          userId: session.userId[0],
        },
        user: { ...user, Account: undefined, Session: undefined },
      }
    },

    async updateSession(newSession) {
      const { sessionToken } = newSession
      const { id } = await getSessionBySessionToken(sessionToken)
      if (!id) return
      await sessionTable.update(id, {
        ...newSession,
        expires: newSession.expires?.toISOString(),
      })
      return <Promise<AdapterSession>>(
        sessionTable.find(id).then((Record) => Record.fields)
      )
    },

    async deleteSession(sessionToken) {
      const sessionId = (await getSessionBySessionToken(sessionToken))?.id
      if (!sessionId) return null
      await sessionTable.destroy(sessionId)
    },

    async createVerificationToken(data) {
      return <Promise<VerificationToken>>(
        verificationTable
          .create({ ...data, expires: data.expires.toISOString() })
          .then((Records) => Records.fields)
      )
    },

    async useVerificationToken({ identifier, token }) {
      const verifier = await getVerificationTokenByIdentifierAndToken({
        identifier,
        token,
      })
      if (!verifier?.id) return null
      verificationTable.destroy(verifier.id.toString())
      return verifier
    },
  }
}
