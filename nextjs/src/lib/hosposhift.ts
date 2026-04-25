import { z } from 'zod'
import { HospitalityRole } from './types'

export const hospitalityRoles: HospitalityRole[] = [
  'bartender',
  'waiter',
  'barista',
  'kitchen_hand',
  'chef',
  'dishwasher',
  'duty_manager',
  'host',
  'runner',
]

const postcodeSchema = z
  .string()
  .trim()
  .regex(/^\d{4}$/, 'Enter a valid Australian postcode (4 digits).')

export const onboardingSchema = z.object({
  role: z.enum(['staff', 'venue_user']),
  full_name: z.string().min(2),
  phone: z.string().trim().min(8).optional().or(z.literal('')),
  suburb: z.string().trim().min(2),
  postcode: postcodeSchema,
  state: z.string().default('WA'),
  create_venue_now: z.boolean().optional(),
})

export const staffProfileSchema = z.object({
  bio: z.string().max(1000).optional().or(z.literal('')),
  years_experience: z.coerce.number().min(0),
  rsa_certificate: z.boolean(),
  food_safety_certificate: z.boolean(),
  preferred_suburbs: z.string().optional().or(z.literal('')),
  hourly_rate_min: z.coerce.number().min(0).nullable(),
  hourly_rate_preferred: z.coerce.number().min(0).nullable(),
  roles: z.array(z.enum(hospitalityRoles as [HospitalityRole, ...HospitalityRole[]])).min(1),
})

export const venueSchema = z.object({
  name: z.string().min(2),
  abn: z.string().optional().or(z.literal('')),
  venue_type: z.string().min(2),
  address: z.string().optional().or(z.literal('')),
  suburb: z.string().min(2),
  postcode: postcodeSchema,
  state: z.string().default('WA'),
  liquor_licensed: z.boolean(),
})

export const availabilitySchema = z
  .object({
    starts_at: z.string().datetime(),
    ends_at: z.string().datetime(),
    status: z.enum(['available', 'tentative', 'unavailable']),
    notes: z.string().optional().or(z.literal('')),
  })
  .refine((v) => new Date(v.ends_at) > new Date(v.starts_at), {
    message: 'End time must be after start time.',
    path: ['ends_at'],
  })

export const staffSearchSchema = z
  .object({
    requested_start: z.string().datetime(),
    requested_end: z.string().datetime(),
    required_role: z.enum(hospitalityRoles as [HospitalityRole, ...HospitalityRole[]]).optional().nullable(),
    required_suburb: z.string().optional().nullable(),
    require_rsa: z.boolean().default(false),
    minimum_rating: z.coerce.number().min(0).max(5).optional().nullable(),
    maximum_hourly_rate: z.coerce.number().min(0).optional().nullable(),
  })
  .refine((v) => new Date(v.requested_end) > new Date(v.requested_start), {
    message: 'End time must be after start time.',
    path: ['requested_end'],
  })

export const shiftRequestSchema = z
  .object({
    venue_id: z.string().uuid(),
    staff_user_id: z.string().uuid(),
    starts_at: z.string().datetime(),
    ends_at: z.string().datetime(),
    role_required: z.enum(hospitalityRoles as [HospitalityRole, ...HospitalityRole[]]),
    hourly_rate: z.coerce.number().min(0),
    message: z.string().optional().or(z.literal('')),
  })
  .refine((v) => new Date(v.ends_at) > new Date(v.starts_at), {
    message: 'End time must be after start time.',
    path: ['ends_at'],
  })

export const ratingSchema = z.object({
  shift_request_id: z.string().uuid(),
  venue_id: z.string().uuid(),
  staff_user_id: z.string().uuid(),
  rating: z.coerce.number().int().min(1).max(5),
  review_text: z.string().max(2000).optional().or(z.literal('')),
})

export const waiverText =
  'Staff involved in the sale, supply or service of liquor in Western Australia generally need RSA training. Venues should verify suitability before confirming shifts. This platform does not provide legal advice.'
