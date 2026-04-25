export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type UserRole = 'staff' | 'venue_user' | 'admin'
export type VenueMemberRole = 'owner' | 'manager' | 'staffing_manager'
export type MembershipStatus = 'pending' | 'approved' | 'rejected'
export type AvailabilityStatus = 'available' | 'tentative' | 'unavailable'
export type ShiftStatus = 'sent' | 'accepted' | 'declined' | 'cancelled' | 'completed'
export type HospitalityRole =
  | 'bartender'
  | 'waiter'
  | 'barista'
  | 'kitchen_hand'
  | 'chef'
  | 'dishwasher'
  | 'duty_manager'
  | 'host'
  | 'runner'

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          role: UserRole
          full_name: string
          phone: string | null
          avatar_url: string | null
          suburb: string | null
          postcode: string | null
          state: string
          created_at: string
          updated_at: string
        }
        Insert: Partial<Database['public']['Tables']['profiles']['Row']> & { id: string; role: UserRole; full_name: string }
        Update: Partial<Database['public']['Tables']['profiles']['Row']>
      }
      staff_profiles: {
        Row: {
          user_id: string
          bio: string | null
          years_experience: number
          rsa_certificate: boolean
          rsa_certificate_verified: boolean
          rsa_certificate_file_url: string | null
          food_safety_certificate: boolean
          approved_for_work: boolean
          roles: HospitalityRole[]
          preferred_suburbs: string[]
          hourly_rate_min: number | null
          hourly_rate_preferred: number | null
          average_rating: number
          ratings_count: number
          created_at: string
          updated_at: string
        }
        Insert: Partial<Database['public']['Tables']['staff_profiles']['Row']> & { user_id: string }
        Update: Partial<Database['public']['Tables']['staff_profiles']['Row']>
      }
      venues: {
        Row: {
          id: string
          name: string
          abn: string | null
          venue_type: string
          address: string | null
          suburb: string
          postcode: string | null
          state: string
          liquor_licensed: boolean
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: Partial<Database['public']['Tables']['venues']['Row']> & { name: string; venue_type: string; suburb: string }
        Update: Partial<Database['public']['Tables']['venues']['Row']>
      }
      venue_memberships: {
        Row: {
          id: string
          venue_id: string
          user_id: string
          role: VenueMemberRole
          status: MembershipStatus
          created_at: string
          updated_at: string
        }
        Insert: Partial<Database['public']['Tables']['venue_memberships']['Row']> & { venue_id: string; user_id: string }
        Update: Partial<Database['public']['Tables']['venue_memberships']['Row']>
      }
      availability_slots: {
        Row: {
          id: string
          staff_user_id: string
          starts_at: string
          ends_at: string
          status: AvailabilityStatus
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: Partial<Database['public']['Tables']['availability_slots']['Row']> & { staff_user_id: string; starts_at: string; ends_at: string }
        Update: Partial<Database['public']['Tables']['availability_slots']['Row']>
      }
      shift_requests: {
        Row: {
          id: string
          venue_id: string
          created_by: string
          staff_user_id: string
          starts_at: string
          ends_at: string
          role_required: HospitalityRole
          hourly_rate: number
          requires_rsa: boolean
          message: string | null
          status: ShiftStatus
          accepted_at: string | null
          completed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: Partial<Database['public']['Tables']['shift_requests']['Row']> & {
          venue_id: string
          created_by: string
          staff_user_id: string
          starts_at: string
          ends_at: string
          role_required: HospitalityRole
          hourly_rate: number
        }
        Update: Partial<Database['public']['Tables']['shift_requests']['Row']>
      }
      ratings: {
        Row: {
          id: string
          shift_request_id: string
          venue_id: string
          staff_user_id: string
          rated_by: string
          rating: number
          review_text: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['ratings']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['ratings']['Row']>
      }
      staff_saved_by_venues: {
        Row: {
          id: string
          venue_id: string
          staff_user_id: string
          created_by: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['staff_saved_by_venues']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['staff_saved_by_venues']['Row']>
      }
    }
    Views: Record<string, never>
    Functions: {
      search_available_staff: {
        Args: {
          requested_start: string
          requested_end: string
          required_role?: HospitalityRole | null
          required_suburb?: string | null
          require_rsa?: boolean
          minimum_rating?: number | null
          maximum_hourly_rate?: number | null
        }
        Returns: {
          user_id: string
          full_name: string
          avatar_url: string | null
          suburb: string | null
          postcode: string | null
          bio: string | null
          years_experience: number
          rsa_certificate: boolean
          rsa_certificate_verified: boolean
          food_safety_certificate: boolean
          roles: HospitalityRole[]
          preferred_suburbs: string[]
          hourly_rate_min: number | null
          hourly_rate_preferred: number | null
          average_rating: number
          ratings_count: number
        }[]
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
