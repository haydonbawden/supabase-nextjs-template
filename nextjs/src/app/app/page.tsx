import { redirect } from 'next/navigation'
import { getSessionProfile } from '@/lib/authz'

export default async function AppHomePage() {
  const { profile } = await getSessionProfile()

  if (!profile) {
    redirect('/app/onboarding')
  }

  if (profile.role === 'staff') redirect('/app/staff')
  if (profile.role === 'venue_user') redirect('/app/venue')
  if (profile.role === 'admin') redirect('/app/admin')

  return null
}
