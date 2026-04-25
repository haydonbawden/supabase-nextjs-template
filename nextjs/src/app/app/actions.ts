'use server'

import { revalidatePath } from 'next/cache'
import { createSSRClient } from '@/lib/supabase/server'
import {
  availabilitySchema,
  onboardingSchema,
  ratingSchema,
  shiftRequestSchema,
  staffProfileSchema,
  staffSearchSchema,
  venueSchema,
} from '@/lib/hosposhift'

async function getAuth() {
  const supabase = await createSSRClient()
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) throw new Error('Not authenticated')
  return { supabase, user: data.user }
}

export async function submitOnboarding(formData: FormData) {
  const { supabase, user } = await getAuth()
  const parsed = onboardingSchema.parse({
    role: formData.get('role'),
    full_name: formData.get('full_name'),
    phone: formData.get('phone') || '',
    suburb: formData.get('suburb'),
    postcode: formData.get('postcode'),
    state: formData.get('state') || 'WA',
  })

  await supabase.from('profiles').upsert({
    id: user.id,
    role: parsed.role,
    full_name: parsed.full_name,
    phone: parsed.phone || null,
    suburb: parsed.suburb,
    postcode: parsed.postcode,
    state: parsed.state || 'WA',
  })

  if (parsed.role === 'staff') {
    await supabase.from('staff_profiles').upsert({ user_id: user.id })
  }

  revalidatePath('/app')
}

export async function saveStaffProfile(formData: FormData) {
  const { supabase, user } = await getAuth()
  const parsed = staffProfileSchema.parse({
    bio: formData.get('bio') || '',
    years_experience: formData.get('years_experience') || 0,
    rsa_certificate: formData.get('rsa_certificate') === 'on',
    food_safety_certificate: formData.get('food_safety_certificate') === 'on',
    preferred_suburbs: formData.get('preferred_suburbs') || '',
    hourly_rate_min: formData.get('hourly_rate_min') ? Number(formData.get('hourly_rate_min')) : null,
    hourly_rate_preferred: formData.get('hourly_rate_preferred') ? Number(formData.get('hourly_rate_preferred')) : null,
    roles: formData.getAll('roles'),
  })

  const preferredSuburbs = parsed.preferred_suburbs
    ? parsed.preferred_suburbs
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : []

  await supabase.from('staff_profiles').upsert({
    user_id: user.id,
    bio: parsed.bio || null,
    years_experience: parsed.years_experience,
    rsa_certificate: parsed.rsa_certificate,
    food_safety_certificate: parsed.food_safety_certificate,
    preferred_suburbs: preferredSuburbs,
    hourly_rate_min: parsed.hourly_rate_min,
    hourly_rate_preferred: parsed.hourly_rate_preferred,
    roles: parsed.roles,
  })

  revalidatePath('/app/staff')
}

export async function uploadCertificate(formData: FormData) {
  const { supabase, user } = await getAuth()
  const file = formData.get('certificate') as File | null
  if (!file) throw new Error('No file selected')
  const safe = file.name.replace(/[^0-9a-zA-Z!\-_.*'()]/g, '_')
  const path = `${user.id}/${Date.now()}-${safe}`
  const { error } = await supabase.storage.from('certificates').upload(path, file)
  if (error) throw error
  await supabase.from('staff_profiles').update({ rsa_certificate_file_url: path }).eq('user_id', user.id)
  revalidatePath('/app/staff')
}

export async function createVenue(formData: FormData) {
  const { supabase, user } = await getAuth()
  const parsed = venueSchema.parse({
    name: formData.get('name'),
    abn: formData.get('abn') || '',
    venue_type: formData.get('venue_type'),
    address: formData.get('address') || '',
    suburb: formData.get('suburb'),
    postcode: formData.get('postcode'),
    state: formData.get('state') || 'WA',
    liquor_licensed: formData.get('liquor_licensed') === 'on',
  })

  await supabase.from('venues').insert({ ...parsed, created_by: user.id })
  revalidatePath('/app/venue')
}

export async function createAvailability(formData: FormData) {
  const { supabase, user } = await getAuth()
  const parsed = availabilitySchema.parse({
    starts_at: new Date(String(formData.get('starts_at'))).toISOString(),
    ends_at: new Date(String(formData.get('ends_at'))).toISOString(),
    status: formData.get('status') || 'available',
    notes: formData.get('notes') || '',
  })

  await supabase.from('availability_slots').insert({
    staff_user_id: user.id,
    starts_at: parsed.starts_at,
    ends_at: parsed.ends_at,
    status: parsed.status,
    notes: parsed.notes || null,
  })
  revalidatePath('/app/staff')
}

export async function deleteAvailability(id: string) {
  const { supabase } = await getAuth()
  await supabase.from('availability_slots').delete().eq('id', id)
  revalidatePath('/app/staff')
}

export async function searchStaffAction(formData: FormData) {
  const { supabase } = await getAuth()
  const parsed = staffSearchSchema.parse({
    requested_start: new Date(String(formData.get('requested_start'))).toISOString(),
    requested_end: new Date(String(formData.get('requested_end'))).toISOString(),
    required_role: (formData.get('required_role') as string) || null,
    required_suburb: (formData.get('required_suburb') as string) || null,
    require_rsa: formData.get('require_rsa') === 'on',
    minimum_rating: formData.get('minimum_rating') ? Number(formData.get('minimum_rating')) : null,
    maximum_hourly_rate: formData.get('maximum_hourly_rate') ? Number(formData.get('maximum_hourly_rate')) : null,
  })

  const { data, error } = await supabase.rpc('search_available_staff', parsed)
  if (error) throw error
  return data ?? []
}

export async function createShiftRequest(formData: FormData) {
  const { supabase, user } = await getAuth()
  const parsed = shiftRequestSchema.parse({
    venue_id: formData.get('venue_id'),
    staff_user_id: formData.get('staff_user_id'),
    starts_at: new Date(String(formData.get('starts_at'))).toISOString(),
    ends_at: new Date(String(formData.get('ends_at'))).toISOString(),
    role_required: formData.get('role_required'),
    hourly_rate: formData.get('hourly_rate'),
    message: formData.get('message') || '',
  })

  const { data: venue } = await supabase
    .from('venues')
    .select('liquor_licensed')
    .eq('id', parsed.venue_id)
    .single()

  const requiresRsa =
    parsed.role_required === 'bartender' || parsed.role_required === 'duty_manager' || !!venue?.liquor_licensed

  await supabase.from('shift_requests').insert({
    venue_id: parsed.venue_id,
    created_by: user.id,
    staff_user_id: parsed.staff_user_id,
    starts_at: parsed.starts_at,
    ends_at: parsed.ends_at,
    role_required: parsed.role_required,
    hourly_rate: parsed.hourly_rate,
    message: parsed.message || null,
    requires_rsa: requiresRsa,
  })
  revalidatePath('/app/venue')
}

export async function updateShiftStatus(id: string, status: 'accepted' | 'declined' | 'cancelled' | 'completed') {
  const { supabase } = await getAuth()
  const payload: { status: string; accepted_at?: string; completed_at?: string } = { status }
  if (status === 'accepted') payload.accepted_at = new Date().toISOString()
  if (status === 'completed') payload.completed_at = new Date().toISOString()
  await supabase.from('shift_requests').update(payload).eq('id', id)
  revalidatePath('/app/staff')
  revalidatePath('/app/venue')
}

export async function createRating(formData: FormData) {
  const { supabase, user } = await getAuth()
  const parsed = ratingSchema.parse({
    shift_request_id: formData.get('shift_request_id'),
    venue_id: formData.get('venue_id'),
    staff_user_id: formData.get('staff_user_id'),
    rating: formData.get('rating'),
    review_text: formData.get('review_text') || '',
  })

  await supabase.from('ratings').insert({
    shift_request_id: parsed.shift_request_id,
    venue_id: parsed.venue_id,
    staff_user_id: parsed.staff_user_id,
    rated_by: user.id,
    rating: parsed.rating,
    review_text: parsed.review_text || null,
  })
  revalidatePath('/app/venue')
  revalidatePath('/app/staff')
}

export async function toggleSaveStaff(venueId: string, staffUserId: string, saved: boolean) {
  const { supabase, user } = await getAuth()
  if (saved) {
    await supabase.from('staff_saved_by_venues').delete().eq('venue_id', venueId).eq('staff_user_id', staffUserId)
  } else {
    await supabase
      .from('staff_saved_by_venues')
      .insert({ venue_id: venueId, staff_user_id: staffUserId, created_by: user.id })
  }
  revalidatePath('/app/venue')
}

export async function reviewMembership(id: string, status: 'approved' | 'rejected') {
  const { supabase } = await getAuth()
  await supabase.from('venue_memberships').update({ status }).eq('id', id)
  revalidatePath('/app/admin')
  revalidatePath('/app/venue')
}

export async function reviewStaff(userId: string, rsaVerified: boolean, approvedForWork: boolean) {
  const { supabase } = await getAuth()
  await supabase
    .from('staff_profiles')
    .update({ rsa_certificate_verified: rsaVerified, approved_for_work: approvedForWork })
    .eq('user_id', userId)
  revalidatePath('/app/admin')
  revalidatePath('/app/staff')
}
