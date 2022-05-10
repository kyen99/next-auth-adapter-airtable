import { Base } from 'airtable'
import { VerificationToken } from 'next-auth/adapters'
import { getRecordsFields } from './utils'

interface AirtableVerification extends VerificationToken {
  id: string
}

export default function Verification(base: Base) {
  const table = base.table('VerificationToken')

  return {
    getVerificationTokenByIdentifierAndToken: ({
      identifier,
      token,
    }: Omit<VerificationToken, 'expires'>) => {
      return <Promise<AirtableVerification | null>>table
        .select({
          filterByFormula: `AND({token}='${token}', {identifier}='${identifier}')`,
        })
        .all()
        .then(getRecordsFields)
    },
    deleteVerification: async (verificationId: string) =>
      table.destroy(verificationId),

    createVerification: async (data: any) =>
      <Promise<VerificationToken>>(
        table
          .create([
            { fields: { ...data, expires: data.expires.toISOString() } },
          ])
          .then(getRecordsFields)
      ),
  }
}
