import { requireRole } from '@/lib/authz'
import { createRating, createShiftRequest, createVenue, toggleSaveStaff, updateShiftStatus } from '../actions'
import { hospitalityRoles, waiverText } from '@/lib/hosposhift'

type MembershipWithVenue = { venue_id: string; venues: { name?: string } | { name?: string }[] | null }
type SearchStaffRow = {
  user_id: string
  full_name: string
  suburb: string | null
  postcode: string | null
  bio: string | null
  roles: string[]
  years_experience: number
  rsa_certificate: boolean
  food_safety_certificate: boolean
  hourly_rate_preferred: number | null
  average_rating: number
  ratings_count: number
}

function isoFromParam(value?: string | null) {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

export default async function VenuePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const { user, supabase } = await requireRole('venue_user')

  const { data: memberships } = await supabase
    .from('venue_memberships')
    .select('id, venue_id, role, status, venues(*)')
    .eq('user_id', user.id)

  const approved = (memberships ?? []).filter((m) => m.status === 'approved')
  const selectedVenueId = (typeof params.venue_id === 'string' && params.venue_id) || approved[0]?.venue_id

  const requestedStart = isoFromParam(typeof params.requested_start === 'string' ? params.requested_start : null)
  const requestedEnd = isoFromParam(typeof params.requested_end === 'string' ? params.requested_end : null)

  const shouldSearch = !!selectedVenueId && !!requestedStart && !!requestedEnd
  const { data: searchResults } = shouldSearch
    ? await supabase.rpc('search_available_staff', {
        requested_start: requestedStart,
        requested_end: requestedEnd,
        required_role: typeof params.required_role === 'string' ? params.required_role : null,
        required_suburb: typeof params.required_suburb === 'string' ? params.required_suburb : null,
        require_rsa: params.require_rsa === 'on',
        minimum_rating: typeof params.minimum_rating === 'string' && params.minimum_rating ? Number(params.minimum_rating) : null,
        maximum_hourly_rate:
          typeof params.maximum_hourly_rate === 'string' && params.maximum_hourly_rate ? Number(params.maximum_hourly_rate) : null,
      })
    : { data: [] as Awaited<ReturnType<typeof supabase.rpc>>['data'] }

  const { data: shifts } = selectedVenueId
    ? await supabase.from('shift_requests').select('*').eq('venue_id', selectedVenueId).order('starts_at', { ascending: false })
    : { data: [] }

  const { data: saved } = selectedVenueId
    ? await supabase.from('staff_saved_by_venues').select('staff_user_id').eq('venue_id', selectedVenueId)
    : { data: [] }

  const savedSet = new Set((saved ?? []).map((s) => s.staff_user_id))
  const awaitingRating = (shifts ?? []).filter((s) => s.status === 'completed')

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold">Venue dashboard</h1>
      <p className="text-sm text-muted-foreground">{waiverText}</p>

      <section className="rounded-lg border bg-white p-4">
        <h2 className="font-semibold">Venue selector</h2>
        <p className="text-sm text-muted-foreground">Switch between your approved venues.</p>
        <form className="mt-2 grid gap-2 md:grid-cols-2" method="get">
          <select name="venue_id" defaultValue={selectedVenueId} className="rounded border p-2">
            {approved.map((m: MembershipWithVenue) => (
              <option key={m.venue_id} value={m.venue_id}>{Array.isArray(m.venues) ? m.venues[0]?.name : m.venues?.name}</option>
            ))}
          </select>
          <button className="rounded border px-3 py-2 text-sm">Use venue</button>
        </form>
      </section>

      <section className="rounded-lg border bg-white p-4">
        <h2 className="font-semibold">Create venue</h2>
        <form action={createVenue} className="mt-2 grid gap-2 md:grid-cols-2">
          <input name="name" placeholder="Venue name" className="rounded border p-2" required />
          <input name="venue_type" placeholder="Venue type" className="rounded border p-2" required />
          <input name="suburb" placeholder="Suburb" className="rounded border p-2" required />
          <input name="postcode" placeholder="Postcode" pattern="\d{4}" className="rounded border p-2" required />
          <input name="address" placeholder="Address" className="rounded border p-2" />
          <input name="abn" placeholder="ABN" className="rounded border p-2" />
          <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" name="liquor_licensed" /> Liquor licensed</label>
          <input name="state" defaultValue="WA" className="rounded border p-2" />
          <button className="rounded bg-primary px-3 py-2 text-sm text-white md:col-span-2">Create venue</button>
        </form>
      </section>

      <section className="rounded-lg border bg-white p-4">
        <h2 className="font-semibold">Search available staff</h2>
        <form className="mt-2 grid gap-2 md:grid-cols-2" method="get">
          <input type="hidden" name="venue_id" value={selectedVenueId} />
          <input type="datetime-local" name="requested_start" required className="rounded border p-2" />
          <input type="datetime-local" name="requested_end" required className="rounded border p-2" />
          <select name="required_role" className="rounded border p-2"><option value="">Any role</option>{hospitalityRoles.map((r) => <option key={r}>{r}</option>)}</select>
          <input name="required_suburb" placeholder="Suburb" className="rounded border p-2" />
          <input type="number" min={0} max={5} step="0.1" name="minimum_rating" placeholder="Minimum rating" className="rounded border p-2" />
          <input type="number" min={0} step="0.01" name="maximum_hourly_rate" placeholder="Maximum hourly rate" className="rounded border p-2" />
          <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" name="require_rsa" /> Require RSA</label>
          <button className="rounded bg-primary px-3 py-2 text-sm text-white">Search</button>
        </form>
        <div className="mt-3 space-y-3">
          {((searchResults ?? []) as SearchStaffRow[]).map((staff) => (
            <div key={staff.user_id} className="rounded border p-3 text-sm">
              <p className="font-medium">{staff.full_name}</p>
              <p>{staff.suburb} {staff.postcode}</p>
              <p>{staff.bio?.slice(0, 140) ?? 'No bio yet.'}</p>
              <p>Roles: {staff.roles?.join(', ')}</p>
              <p>Experience: {staff.years_experience} years • RSA: {staff.rsa_certificate ? 'Yes' : 'No'} • Food safety: {staff.food_safety_certificate ? 'Yes' : 'No'}</p>
              <p>Rate preferred: {staff.hourly_rate_preferred ? `$${staff.hourly_rate_preferred}` : 'N/A'} • Rating: {staff.average_rating} ({staff.ratings_count})</p>

              <details className="mt-2">
                <summary className="cursor-pointer font-medium">Request shift</summary>
                <form action={createShiftRequest} className="mt-2 grid gap-2 md:grid-cols-2">
                  <input type="hidden" name="venue_id" value={selectedVenueId} />
                  <input type="hidden" name="staff_user_id" value={staff.user_id} />
                  <input type="datetime-local" name="starts_at" required className="rounded border p-2" />
                  <input type="datetime-local" name="ends_at" required className="rounded border p-2" />
                  <select name="role_required" className="rounded border p-2">{hospitalityRoles.map((r) => <option key={r}>{r}</option>)}</select>
                  <input type="number" min={0} step="0.01" name="hourly_rate" required className="rounded border p-2" />
                  <input name="message" placeholder="Message" className="rounded border p-2 md:col-span-2" />
                  <p className="text-xs text-amber-700 md:col-span-2">This role may involve the sale, supply or service of liquor. In Western Australia, RSA training is generally required for staff engaged in those duties. Please verify suitability before confirming the shift.</p>
                  <button className="rounded border px-3 py-2 text-sm">Send shift request</button>
                </form>
              </details>

              <form action={toggleSaveStaff.bind(null, selectedVenueId, staff.user_id, savedSet.has(staff.user_id))} className="mt-2">
                <button className="rounded border px-3 py-1">{savedSet.has(staff.user_id) ? 'Unsave staff' : 'Save staff'}</button>
              </form>
            </div>
          ))}
          {!searchResults?.length && <p className="text-sm text-muted-foreground">No results yet. Search by requested start and end time.</p>}
        </div>
      </section>

      <section className="rounded-lg border bg-white p-4">
        <h2 className="font-semibold">Sent & accepted shifts</h2>
        <div className="space-y-2 text-sm">
          {(shifts ?? []).map((s) => (
            <div key={s.id} className="rounded border p-2">
              <p>Status: {s.status} • {s.role_required} • ${s.hourly_rate}/hr</p>
              {s.status === 'sent' && <form action={updateShiftStatus.bind(null, s.id, 'cancelled')}><button className="rounded border px-2 py-1">Cancel request</button></form>}
              {s.status === 'accepted' && <form action={updateShiftStatus.bind(null, s.id, 'completed')}><button className="rounded border px-2 py-1">Mark completed</button></form>}
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-lg border bg-white p-4">
        <h2 className="font-semibold">Completed shifts awaiting rating</h2>
        <div className="space-y-2">
          {awaitingRating.map((s) => (
            <form key={s.id} action={createRating} className="rounded border p-3 text-sm">
              <input type="hidden" name="shift_request_id" value={s.id} />
              <input type="hidden" name="venue_id" value={s.venue_id} />
              <input type="hidden" name="staff_user_id" value={s.staff_user_id} />
              <p>Shift {new Date(s.starts_at).toLocaleString()} </p>
              <input type="number" name="rating" min={1} max={5} required className="mt-1 rounded border p-1" />
              <textarea name="review_text" className="mt-1 w-full rounded border p-2" placeholder="Review" />
              <button className="mt-1 rounded border px-3 py-1">Submit rating</button>
            </form>
          ))}
          {!awaitingRating.length && <p className="text-sm text-muted-foreground">No completed shifts awaiting rating.</p>}
        </div>
      </section>
    </div>
  )
}
