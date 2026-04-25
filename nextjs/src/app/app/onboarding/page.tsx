import { redirect } from 'next/navigation'
import { submitOnboarding } from '../actions'
import { getSessionProfile } from '@/lib/authz'

export default async function OnboardingPage() {
  const { profile } = await getSessionProfile()
  if (profile) redirect('/app')

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Complete your HospoShift WA onboarding</h1>
      <p className="text-sm text-muted-foreground">
        HospoShift WA helps Western Australian hospitality venues find casual staff for short-notice shifts.
      </p>
      <form action={submitOnboarding} className="space-y-3 rounded-lg border bg-white p-4">
        <div>
          <label className="text-sm">Role</label>
          <select name="role" className="mt-1 w-full rounded border p-2" required>
            <option value="staff">Staff</option>
            <option value="venue_user">Venue User</option>
          </select>
        </div>
        <input name="full_name" placeholder="Full name" className="w-full rounded border p-2" required />
        <input name="phone" placeholder="Phone" className="w-full rounded border p-2" />
        <input name="suburb" placeholder="Suburb" className="w-full rounded border p-2" required />
        <input name="postcode" placeholder="Postcode" className="w-full rounded border p-2" pattern="\d{4}" required />
        <input name="state" defaultValue="WA" className="w-full rounded border p-2" required />
        <button className="rounded bg-primary px-3 py-2 text-sm text-white">Save onboarding</button>
      </form>
    </div>
  )
}
