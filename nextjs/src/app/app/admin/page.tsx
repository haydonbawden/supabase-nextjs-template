import { requireRole } from '@/lib/authz'
import { reviewMembership, reviewStaff } from '../actions'

export default async function AdminPage() {
  const { supabase } = await requireRole('admin')

  const [{ data: staff }, { data: venues }, { data: pendingMemberships }] = await Promise.all([
    supabase
      .from('staff_profiles')
      .select('user_id, rsa_certificate, rsa_certificate_verified, approved_for_work, rsa_certificate_file_url, years_experience, profiles(full_name, suburb, postcode)')
      .order('updated_at', { ascending: false }),
    supabase.from('venues').select('*').order('created_at', { ascending: false }),
    supabase.from('venue_memberships').select('id, role, status, venue_id, user_id').eq('status', 'pending'),
  ])

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold">Admin panel</h1>

      <section className="rounded-lg border bg-white p-4">
        <h2 className="font-semibold">Staff profiles / RSA verification</h2>
        <div className="mt-2 space-y-2 text-sm">
          {(staff ?? []).map((s) => (
            <div key={s.user_id} className="rounded border p-2">
              <p className="font-medium">{(() => { const profileData = s.profiles as unknown; if (Array.isArray(profileData)) return profileData[0]?.full_name ?? s.user_id; return (profileData as { full_name?: string } | null)?.full_name ?? s.user_id })()}</p>
              <p>RSA: {s.rsa_certificate ? 'Yes' : 'No'} • Verified: {s.rsa_certificate_verified ? 'Yes' : 'No'} • Approved for work: {s.approved_for_work ? 'Yes' : 'No'}</p>
              {s.rsa_certificate_file_url && <p>Certificate path: {s.rsa_certificate_file_url}</p>}
              <div className="mt-1 flex gap-2">
                <form action={reviewStaff.bind(null, s.user_id, true, s.approved_for_work)}><button className="rounded border px-2 py-1">Verify RSA</button></form>
                <form action={reviewStaff.bind(null, s.user_id, s.rsa_certificate_verified, true)}><button className="rounded border px-2 py-1">Approve for work</button></form>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border bg-white p-4">
        <h2 className="font-semibold">Venues</h2>
        <div className="mt-2 grid gap-2 text-sm md:grid-cols-2">
          {(venues ?? []).map((v) => (
            <div key={v.id} className="rounded border p-2">{v.name} • {v.suburb} {v.postcode} • {v.liquor_licensed ? 'Liquor licensed' : 'No liquor licence'}</div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border bg-white p-4">
        <h2 className="font-semibold">Pending venue memberships</h2>
        <div className="space-y-2 text-sm">
          {(pendingMemberships ?? []).map((m) => (
            <div key={m.id} className="rounded border p-2">
              <p>Venue: {m.venue_id} • User: {m.user_id} • Role: {m.role}</p>
              <div className="mt-1 flex gap-2">
                <form action={reviewMembership.bind(null, m.id, 'approved')}><button className="rounded border px-2 py-1">Approve</button></form>
                <form action={reviewMembership.bind(null, m.id, 'rejected')}><button className="rounded border px-2 py-1">Reject</button></form>
              </div>
            </div>
          ))}
          {!pendingMemberships?.length && <p className="text-muted-foreground">No pending membership requests.</p>}
        </div>
      </section>

      <section className="rounded-lg border bg-white p-4">
        <h2 className="font-semibold">Flagged / incomplete data</h2>
        <p className="text-sm text-muted-foreground">Use this panel to identify staff without verified RSA or without approved-for-work status.</p>
      </section>
    </div>
  )
}
