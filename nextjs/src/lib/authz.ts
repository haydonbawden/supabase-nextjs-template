import { redirect } from 'next/navigation'
import { createSSRClient } from './supabase/server'
import { UserRole } from './types'

export async function getSessionProfile() {
  const supabase = await createSSRClient()
  const { data: userRes } = await supabase.auth.getUser()
  if (!userRes.user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userRes.user.id)
    .maybeSingle()

  return { supabase, user: userRes.user, profile }
}

export async function requireRole(role: UserRole) {
  const { user, profile, supabase } = await getSessionProfile()
  if (!profile) redirect('/app/onboarding')
  if (profile.role !== role) redirect('/app')
  return { user, profile, supabase }
}
