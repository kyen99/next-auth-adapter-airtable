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
      const { userId } = await am.getAccountByProvider({
        providerAccountId,
        provider,
      })
      if (!userId) return null
      return am.getUserById(userId)
    },

    async updateUser(user) {
      const { id } = await am.updateUser(user)
      return am.getUserById(id)
    },

    async deleteUser(userId) {
      am.deleteUser(userId)
    },

    async linkAccount(account) {
      am.createAccount(account)
    },

    async unlinkAccount({ providerAccountId, provider }) {
      const account = await am.getAccountByProvider({
        providerAccountId,
        provider,
      })
      const { id } = account
      if (!id) throw Error('Could not unlink account.')
      am.deleteAccount(id)
    },

    async createSession(session) {
      return am.createSession(session)
    },

    async getSessionAndUser(sessionToken) {
      const session = await am.getSessionBySessionToken(sessionToken)
      if (!session) return null
      const user = await am.getUserById(session.userId)
      return {
        session,
        user,
      }
    },

    async updateSession(newSession) {
      const { id } = await am.updateSession(newSession)
      return am.getSession(id)
    },

    async deleteSession(sessionToken) {
      const sessionId = (await am.getSessionBySessionToken(sessionToken))?.id
      if (!sessionId) return null
      am.deleteSession(sessionId)
    },

    async createVerificationToken(data) {
      return am.createVerification(data)
    },

    async useVerificationToken({ identifier, token }) {
      const verifier = await am.getVerificationTokenByIdentifierAndToken({
        identifier,
        token,
      })
      if (!verifier?.id) return null
      am.deleteVerification(verifier.id)
      return verifier
    },
  }
}
