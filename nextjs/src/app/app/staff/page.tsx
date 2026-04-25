import { requireRole } from '@/lib/authz'
import { createAvailability, deleteAvailability, saveStaffProfile, updateShiftStatus, uploadCertificate } from '../actions'
import { hospitalityRoles, waiverText } from '@/lib/hosposhift'

export default async function StaffPage() {
  const { user, supabase, profile } = await requireRole('staff')

  const [{ data: staff }, { data: availability }, { data: shifts }, { data: ratings }] = await Promise.all([
    supabase.from('staff_profiles').select('*').eq('user_id', user.id).maybeSingle(),
    supabase.from('availability_slots').select('*').eq('staff_user_id', user.id).order('starts_at', { ascending: true }),
    supabase.from('shift_requests').select('*').eq('staff_user_id', user.id).order('starts_at', { ascending: false }),
    supabase.from('ratings').select('*').eq('staff_user_id', user.id).order('created_at', { ascending: false }),
  ])

  const incoming = (shifts ?? []).filter((s) => s.status === 'sent')
  const accepted = (shifts ?? []).filter((s) => s.status === 'accepted')
  const completed = (shifts ?? []).filter((s) => s.status === 'completed')

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold">Staff dashboard</h1>
      <p className="text-sm text-muted-foreground">{waiverText}</p>

      <section className="rounded-lg border bg-white p-4">
        <h2 className="font-semibold">Profile completion</h2>
        <p className="text-sm">{profile.full_name} • {profile.suburb}, {profile.postcode} • State: {profile.state}</p>
        <p className="mt-1 text-sm text-muted-foreground">Approved for work: {staff?.approved_for_work ? 'Yes' : 'No'}</p>
      </section>

      <section className="rounded-lg border bg-white p-4">
        <h2 className="font-semibold">Edit staff profile</h2>
        <form action={saveStaffProfile} className="mt-3 grid gap-2">
          <textarea name="bio" defaultValue={staff?.bio ?? ''} className="rounded border p-2" placeholder="Bio" />
          <input type="number" step="0.1" min={0} name="years_experience" defaultValue={staff?.years_experience ?? 0} className="rounded border p-2" />
          <input type="text" name="preferred_suburbs" defaultValue={staff?.preferred_suburbs?.join(', ') ?? ''} placeholder="Preferred suburbs (comma separated)" className="rounded border p-2" />
          <input type="number" min={0} step="0.01" name="hourly_rate_min" defaultValue={staff?.hourly_rate_min ?? ''} placeholder="Hourly minimum" className="rounded border p-2" />
          <input type="number" min={0} step="0.01" name="hourly_rate_preferred" defaultValue={staff?.hourly_rate_preferred ?? ''} placeholder="Hourly preferred" className="rounded border p-2" />
          <label className="text-sm font-medium">Hospitality roles</label>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {hospitalityRoles.map((r) => (
              <label key={r} className="inline-flex items-center gap-2">
                <input type="checkbox" name="roles" value={r} defaultChecked={staff?.roles?.includes(r)} /> {r}
              </label>
            ))}
          </div>
          <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" name="rsa_certificate" defaultChecked={staff?.rsa_certificate} /> RSA certificate</label>
          <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" name="food_safety_certificate" defaultChecked={staff?.food_safety_certificate} /> Food safety certificate</label>
          <button className="mt-2 rounded bg-primary px-3 py-2 text-sm text-white">Save profile</button>
        </form>
      </section>

      <section className="rounded-lg border bg-white p-4">
        <h2 className="font-semibold">RSA certificate upload and status</h2>
        <p className="text-sm">RSA verified: {staff?.rsa_certificate_verified ? 'Yes' : 'No'}</p>
        <form action={uploadCertificate} className="mt-2 flex items-center gap-2">
          <input type="file" name="certificate" accept="application/pdf,image/jpeg,image/png,image/webp" required />
          <button className="rounded border px-3 py-1 text-sm">Upload</button>
        </form>
      </section>

      <section className="rounded-lg border bg-white p-4">
        <h2 className="font-semibold">Availability manager</h2>
        <form action={createAvailability} className="mt-2 grid gap-2 md:grid-cols-4">
          <input type="datetime-local" name="starts_at" className="rounded border p-2" required />
          <input type="datetime-local" name="ends_at" className="rounded border p-2" required />
          <select name="status" className="rounded border p-2">
            <option value="available">available</option>
            <option value="tentative">tentative</option>
            <option value="unavailable">unavailable</option>
          </select>
          <button className="rounded bg-primary px-3 py-2 text-sm text-white">Add slot</button>
          <input name="notes" className="rounded border p-2 md:col-span-4" placeholder="Notes" />
        </form>
        <div className="mt-3 space-y-2 text-sm">
          {availability?.length ? availability.map((slot) => (
            <div key={slot.id} className="flex items-center justify-between rounded border p-2">
              <span>{new Date(slot.starts_at).toLocaleString()} → {new Date(slot.ends_at).toLocaleString()} ({slot.status})</span>
              <form action={deleteAvailability.bind(null, slot.id)}>
                <button className="text-red-600">Delete</button>
              </form>
            </div>
          )) : <p className="text-muted-foreground">No availability slots yet.</p>}
        </div>
      </section>

      <section className="rounded-lg border bg-white p-4">
        <h2 className="font-semibold">Incoming shift requests</h2>
        <div className="space-y-2 text-sm">
          {incoming.length ? incoming.map((s) => (
            <div key={s.id} className="rounded border p-2">
              <p>{s.role_required} • ${s.hourly_rate}/hr • {new Date(s.starts_at).toLocaleString()}</p>
              <div className="mt-1 flex gap-2">
                <form action={updateShiftStatus.bind(null, s.id, 'accepted')}><button className="rounded border px-2 py-1">Accept</button></form>
                <form action={updateShiftStatus.bind(null, s.id, 'declined')}><button className="rounded border px-2 py-1">Decline</button></form>
              </div>
            </div>
          )) : <p className="text-muted-foreground">No incoming requests.</p>}
        </div>
      </section>

      <section className="rounded-lg border bg-white p-4"><h2 className="font-semibold">Accepted shifts</h2><p className="text-sm">{accepted.length} accepted shifts.</p></section>
      <section className="rounded-lg border bg-white p-4"><h2 className="font-semibold">Completed shifts</h2><p className="text-sm">{completed.length} completed shifts.</p></section>
      <section className="rounded-lg border bg-white p-4"><h2 className="font-semibold">Ratings summary</h2><p className="text-sm">Average: {staff?.average_rating ?? 0} ({staff?.ratings_count ?? 0} ratings)</p><p className="text-sm">Latest ratings: {ratings?.length ?? 0}</p></section>
    </div>
  )
}
