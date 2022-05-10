import Airtable from 'airtable'
import Account from './account'
import User from './user'
import Session from './session'
import Verification from './verification'

export interface AirtableModelOptions {
  apiKey: string // The apikey from your account page in Airtable
  baseId: string // e.g. https://airtable.com/baseId/something/somethingelse
}

export default function AirtableModel({
  apiKey,
  baseId,
}: AirtableModelOptions): any {
  if (!apiKey || !baseId) throw Error('Missing apiKey or baseId')
  const airtable = new Airtable({ apiKey })
  const base = airtable.base(baseId)

  return {
    account: Account(base),
    user: User(base),
    session: Session(base),
    verification: Verification(base),
  }
}
