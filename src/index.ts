import { Adapter } from 'next-auth/adapters'
import AirtableModel, { AirtableOptions } from './model'

export default function AirtableAdapter(options: AirtableOptions): Adapter {
  const am = AirtableModel(options)
  return {
    async createUser(user: any) {
      return am.insertUser(user)
    },

    async getUser(id) {
      return am.getUserById(id)
    },

    async getUserByEmail(email) {
      return am.getUserByEmail(email)
    },

    async getUserByAccount({ providerAccountId, provider }) {
      const user = await am.getAccountByProvider({
        providerAccountId,
        provider,
      })
      const { userId } = user || {}
      if (!userId) return null
      return am.getUserById(userId.toString())
    },

    // @ts-ignore - shouldn't updateUser be able to return null?
    // what if the user record was deleted?
    async updateUser(user) {
      const u = await am.updateUser(user)
      if (!u) return null
      return am.getUserById(u.id.toString())
    },

    async deleteUser(userId) {
      return am.deleteUser(userId)
    },

    async linkAccount(account) {
      await am.createAccount(account)
    },

    async unlinkAccount({ providerAccountId, provider }) {
      const account = await am.getAccountByProvider({
        providerAccountId,
        provider,
      })
      const { id } = account || {}
      if (!id)
        throw Error('Could not unlink account because it does not exist.')
      await am.deleteAccount(id.toString())
    },

    async createSession(session) {
      return am.createSession(session)
    },

    async getSessionAndUser(sessionToken) {
      const session = await am.getSessionBySessionToken(sessionToken)
      if (!session) return null
      const user = await am.getUserById(session.userId)
      if (!user) return null
      return {
        session,
        user,
      }
    },

    async updateSession(newSession) {
      const session = await am.updateSession(newSession)
      return session ? am.getSession(session.id) : null
    },

    async deleteSession(sessionToken) {
      const sessionId = (await am.getSessionBySessionToken(sessionToken))?.id
      if (!sessionId) return null
      await am.deleteSession(sessionId)
    },

    async createVerificationToken(data) {
      const verifier = await am.createVerification(data)
      if (!verifier) return null
      const { expires, identifier, token } = verifier
      return {
        token,
        identifier,
        expires,
      }
    },

    async useVerificationToken({ identifier, token }) {
      const verifier = await am.getVerificationTokenByIdentifierAndToken({
        identifier,
        token,
      })
      if (!verifier?.id) return null
      await am.deleteVerification(verifier.id)
      return {
        token: verifier.token,
        identifier: verifier.identifier,
        expires: new Date(verifier.expires),
      }
    },
  }
}
