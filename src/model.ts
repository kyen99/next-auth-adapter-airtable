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

export default function AirtableModel({ apiKey, baseId }: AirtableOptions) {
  if (!apiKey || !baseId) throw Error('Missing apiKey or baseId')
  const airtable = new Airtable({ apiKey })
  const base = airtable.base(baseId)
  const accountTable = base.table('Account')
  const userTable = base.table('User')
  const sessionTable = base.table('Session')
  const verificationTable = base.table('VerificationToken')
  return {
    getUserById: getUserById(userTable),
    getUserByEmail: getUserByEmail(userTable),
    getSessionBySessionToken: getSessionBySessionToken(sessionTable),
    getAccountByProvider: getAccountByProvider(accountTable),
    getVerificationTokenByIdentifierAndToken:
      getVerificationTokenByIdentifierAndToken(verificationTable),
    insertUser: insertUser(userTable),
    updateUser: updateUser(userTable),
    deleteUser: deleteUser(userTable),
    createAccount: createAccount(accountTable),
    deleteAccount: deleteAccount(accountTable),
    createSession: createSession(sessionTable),
    updateSession: updateSession(sessionTable),
    getSession: getSession(sessionTable),
    deleteSession: deleteSession(sessionTable),
    createVerification: createVerification(verificationTable),
    deleteVerification: deleteVerification(verificationTable),
  }
}

const createVerification =
  (verificationTable: Table<any>) => async (data: any) => {
    return <Promise<VerificationToken>>(
      verificationTable
        .create([{ fields: { ...data, expires: data.expires.toISOString() } }])
        .then((Records) => Records[0].fields)
    )
  }

const deleteVerification =
  (verificationTable: Table<any>) => async (verificationId: string) => {
    return verificationTable.destroy(verificationId)
  }

const insertUser = (userTable: Table<any>) => async (user: AdapterUser) =>
  <Promise<AdapterUser>>(
    userTable.create([{ fields: user }]).then((Records) => Records[0].fields)
  )

const updateUser =
  (userTable: Table<any>) => async (user: Partial<AdapterUser>) => {
    const { id, ...userFields } = user
    if (!id)
      throw Error('Cannot update user. User id does not exist in user table')
    return userTable
      .update(id, <Partial<FieldSet>>userFields)
      .then((Record) => Record.fields)
  }

const deleteUser = (userTable: Table<any>) => async (userId: string) =>
  userTable.destroy(userId)

const getUserById = (userTable: Table<any>) => async (userId: string) => {
  return <Promise<AdapterUser>>userTable
    .find(userId)
    .then((Record) => Record.fields)
    .then((user) => ({ ...user, Account: undefined, Session: undefined }))
}

const createAccount = (accountTable: Table<any>) => async (account: any) => {
  const accountFields = { ...account, userId: [account.userId] }
  accountTable.create(accountFields)
}

const deleteAccount =
  (accountTable: Table<any>) => async (accountId: string) => {
    accountTable.destroy(accountId)
  }

const createSession =
  (sessionTable: Table<any>) =>
  async ({
    sessionToken,
    userId,
    expires,
  }: {
    sessionToken: string
    userId: string
    expires: Date
  }) => {
    const sessionFields = {
      sessionToken,
      expires: expires.toISOString(),
      userId: [userId],
    }
    return <Promise<AdapterSession>>sessionTable
      .create(sessionFields)
      .then((Record) => Record.fields)
      .then((fields) => ({ ...fields, expires: new Date(expires) }))
  }

const updateSession =
  (sessionTable: Table<any>) => async (newSession: Partial<AdapterSession>) => {
    const { sessionToken = '' } = newSession
    const { id } = await getSessionBySessionToken(sessionTable)(sessionToken)
    if (!id) return
    return sessionTable
      .update(id, {
        ...newSession,
        expires: newSession.expires?.toISOString(),
      })
      .then((Record) => Record.fields)
  }

const getSession = (sessionTable: Table<any>) => (sessionId: string) => {
  return <Promise<AdapterSession>>(
    sessionTable.find(sessionId).then((Record) => Record.fields)
  )
}

const deleteSession = (sessionTable: Table<any>) => (sessionId: string) =>
  sessionTable.destroy(sessionId)

const getSessionBySessionToken =
  (sessionTable: Table<any>) =>
  (sessionToken: string): Promise<AdapterSession> => {
    return <Promise<AdapterSession>>sessionTable
      .select({ filterByFormula: `{sessionToken} = '${sessionToken}'` })
      .all()
      .then((Records) => (Records.length ? Records[0].fields : null))
      .then((fields) => {
        if (!fields) return null
        const userId = Array.isArray(fields.userId)
          ? fields.userId[0]
          : fields.userId
        return { ...fields, userId, expires: new Date(fields.expires) }
      })
  }

const getAccountByProvider =
  (accountTable: Table<any>) =>
  async ({
    providerAccountId,
    provider,
  }: {
    providerAccountId: string
    provider: string
  }) => {
    return accountTable
      .select({
        filterByFormula: `AND({providerAccountId}='${providerAccountId}', {provider}='${provider}')`,
      })
      .all()
      .then((Records) => (Records.length > 0 ? Records[0].fields : {}))
  }

const getVerificationTokenByIdentifierAndToken =
  (verificationTable: Table<any>) =>
  ({ identifier, token }: { identifier: string; token: string }) => {
    return <Promise<VerificationToken & { id?: string }>>verificationTable
      .select({
        filterByFormula: `AND({token}='${token}', {identifier}='${identifier}')`,
      })
      .all()
      .then((Records) => (Records.length ? Records[0].fields : null))
  }

const getUserByEmail = (userTable: Table<any>) => (email: string) => {
  return <Promise<AdapterUser>>userTable
    .select({ filterByFormula: `{email}='${email}'` })
    .all()
    .then((Records) => (Records.length > 0 ? Records[0].fields : null))
}
