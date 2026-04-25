begin;

create extension if not exists pgcrypto;

create type public.user_role as enum ('staff', 'venue_user', 'admin');

create type public.venue_member_role as enum (
  'owner',
  'manager',
  'staffing_manager'
);

create type public.membership_status as enum (
  'pending',
  'approved',
  'rejected'
);

create type public.availability_status as enum (
  'available',
  'tentative',
  'unavailable'
);

create type public.shift_status as enum (
  'sent',
  'accepted',
  'declined',
  'cancelled',
  'completed'
);

create type public.hospitality_role as enum (
  'bartender',
  'waiter',
  'barista',
  'kitchen_hand',
  'chef',
  'dishwasher',
  'duty_manager',
  'host',
  'runner'
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.user_role not null,
  full_name text not null,
  phone text,
  avatar_url text,
  suburb text,
  postcode text,
  state text not null default 'WA',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.staff_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  bio text,
  years_experience numeric(4,1) not null default 0,
  rsa_certificate boolean not null default false,
  rsa_certificate_verified boolean not null default false,
  rsa_certificate_file_url text,
  food_safety_certificate boolean not null default false,
  approved_for_work boolean not null default false,
  roles public.hospitality_role[] not null default '{}',
  preferred_suburbs text[] not null default '{}',
  hourly_rate_min numeric(8,2),
  hourly_rate_preferred numeric(8,2),
  average_rating numeric(3,2) not null default 0,
  ratings_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint staff_years_experience_non_negative check (years_experience >= 0),
  constraint staff_hourly_rate_min_non_negative check (hourly_rate_min is null or hourly_rate_min >= 0),
  constraint staff_hourly_rate_preferred_non_negative check (hourly_rate_preferred is null or hourly_rate_preferred >= 0),
  constraint staff_average_rating_range check (average_rating >= 0 and average_rating <= 5),
  constraint staff_ratings_count_non_negative check (ratings_count >= 0)
);

create table public.venues (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  abn text,
  venue_type text not null,
  address text,
  suburb text not null,
  postcode text,
  state text not null default 'WA',
  liquor_licensed boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.venue_memberships (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.venue_member_role not null default 'staffing_manager',
  status public.membership_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (venue_id, user_id)
);

create table public.availability_slots (
  id uuid primary key default gen_random_uuid(),
  staff_user_id uuid not null references public.profiles(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status public.availability_status not null default 'available',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint availability_valid_range check (ends_at > starts_at)
);

create table public.shift_requests (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete restrict,
  staff_user_id uuid not null references public.profiles(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  role_required public.hospitality_role not null,
  hourly_rate numeric(8,2) not null,
  requires_rsa boolean not null default false,
  message text,
  status public.shift_status not null default 'sent',
  accepted_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint shift_valid_range check (ends_at > starts_at),
  constraint shift_hourly_rate_non_negative check (hourly_rate >= 0)
);

create table public.ratings (
  id uuid primary key default gen_random_uuid(),
  shift_request_id uuid not null unique references public.shift_requests(id) on delete cascade,
  venue_id uuid not null references public.venues(id) on delete cascade,
  staff_user_id uuid not null references public.profiles(id) on delete cascade,
  rated_by uuid not null references public.profiles(id) on delete restrict,
  rating integer not null check (rating between 1 and 5),
  review_text text,
  created_at timestamptz not null default now()
);

create table public.staff_saved_by_venues (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues(id) on delete cascade,
  staff_user_id uuid not null references public.profiles(id) on delete cascade,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (venue_id, staff_user_id)
);

create index profiles_role_idx on public.profiles (role);
create index profiles_suburb_idx on public.profiles (suburb);
create index profiles_postcode_idx on public.profiles (postcode);

create index staff_roles_idx on public.staff_profiles using gin (roles);
create index staff_preferred_suburbs_idx on public.staff_profiles using gin (preferred_suburbs);
create index staff_rsa_idx on public.staff_profiles (rsa_certificate, rsa_certificate_verified);
create index staff_rating_idx on public.staff_profiles (average_rating desc, ratings_count desc);

create index venues_suburb_idx on public.venues (suburb);
create index venues_created_by_idx on public.venues (created_by);

create index venue_memberships_user_idx on public.venue_memberships (user_id);
create index venue_memberships_venue_idx on public.venue_memberships (venue_id);
create index venue_memberships_approved_idx
  on public.venue_memberships (venue_id, user_id)
  where status = 'approved';

create index availability_staff_time_idx
  on public.availability_slots (staff_user_id, starts_at, ends_at);

create index availability_time_idx
  on public.availability_slots (starts_at, ends_at)
  where status = 'available';

create index shift_staff_idx
  on public.shift_requests (staff_user_id, starts_at);

create index shift_venue_idx
  on public.shift_requests (venue_id, starts_at);

create index shift_status_idx
  on public.shift_requests (status);

create index ratings_staff_idx on public.ratings (staff_user_id);
create index ratings_venue_idx on public.ratings (venue_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger staff_profiles_set_updated_at
before update on public.staff_profiles
for each row execute function public.set_updated_at();

create trigger venues_set_updated_at
before update on public.venues
for each row execute function public.set_updated_at();

create trigger venue_memberships_set_updated_at
before update on public.venue_memberships
for each row execute function public.set_updated_at();

create trigger availability_slots_set_updated_at
before update on public.availability_slots
for each row execute function public.set_updated_at();

create trigger shift_requests_set_updated_at
before update on public.shift_requests
for each row execute function public.set_updated_at();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'staff'
  );
$$;

create or replace function public.is_venue_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'venue_user'
  );
$$;

create or replace function public.is_approved_venue_member(v_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.venue_memberships
    where venue_id = v_id
      and user_id = auth.uid()
      and status = 'approved'
  );
$$;

create or replace function public.is_venue_owner_or_manager(v_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.venue_memberships
    where venue_id = v_id
      and user_id = auth.uid()
      and status = 'approved'
      and role in ('owner', 'manager')
  );
$$;

create or replace function public.staff_has_available_slot(
  staff_id uuid,
  requested_start timestamptz,
  requested_end timestamptz
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.availability_slots a
    where a.staff_user_id = staff_id
      and a.status = 'available'
      and a.starts_at <= requested_start
      and a.ends_at >= requested_end
  );
$$;

create or replace function public.recalculate_staff_rating(staff_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.staff_profiles sp
  set
    average_rating = coalesce((
      select round(avg(r.rating)::numeric, 2)
      from public.ratings r
      where r.staff_user_id = staff_id
    ), 0),
    ratings_count = (
      select count(*)
      from public.ratings r
      where r.staff_user_id = staff_id
    ),
    updated_at = now()
  where sp.user_id = staff_id;
end;
$$;

create or replace function public.after_rating_insert_recalculate()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.recalculate_staff_rating(new.staff_user_id);
  return new;
end;
$$;

create trigger ratings_after_insert_recalculate
after insert on public.ratings
for each row execute function public.after_rating_insert_recalculate();

create or replace function public.create_owner_membership_for_new_venue()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.created_by is not null then
    insert into public.venue_memberships (
      venue_id,
      user_id,
      role,
      status
    )
    values (
      new.id,
      new.created_by,
      'owner',
      'approved'
    )
    on conflict (venue_id, user_id) do nothing;
  end if;

  return new;
end;
$$;

create trigger venues_after_insert_create_owner_membership
after insert on public.venues
for each row execute function public.create_owner_membership_for_new_venue();

create or replace function public.search_available_staff(
  requested_start timestamptz,
  requested_end timestamptz,
  required_role public.hospitality_role default null,
  required_suburb text default null,
  require_rsa boolean default false,
  minimum_rating numeric default null,
  maximum_hourly_rate numeric default null
)
returns table (
  user_id uuid,
  full_name text,
  avatar_url text,
  suburb text,
  postcode text,
  bio text,
  years_experience numeric,
  rsa_certificate boolean,
  rsa_certificate_verified boolean,
  food_safety_certificate boolean,
  roles public.hospitality_role[],
  preferred_suburbs text[],
  hourly_rate_min numeric,
  hourly_rate_preferred numeric,
  average_rating numeric,
  ratings_count integer
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id as user_id,
    p.full_name,
    p.avatar_url,
    p.suburb,
    p.postcode,
    sp.bio,
    sp.years_experience,
    sp.rsa_certificate,
    sp.rsa_certificate_verified,
    sp.food_safety_certificate,
    sp.roles,
    sp.preferred_suburbs,
    sp.hourly_rate_min,
    sp.hourly_rate_preferred,
    sp.average_rating,
    sp.ratings_count
  from public.profiles p
  join public.staff_profiles sp on sp.user_id = p.id
  where p.role = 'staff'
    and sp.approved_for_work = true
    and exists (
      select 1
      from public.availability_slots a
      where a.staff_user_id = p.id
        and a.status = 'available'
        and a.starts_at <= requested_start
        and a.ends_at >= requested_end
    )
    and (
      required_role is null
      or required_role = any(sp.roles)
    )
    and (
      required_suburb is null
      or p.suburb ilike required_suburb
      or required_suburb = any(sp.preferred_suburbs)
    )
    and (
      require_rsa = false
      or sp.rsa_certificate = true
    )
    and (
      minimum_rating is null
      or sp.average_rating >= minimum_rating
    )
    and (
      maximum_hourly_rate is null
      or sp.hourly_rate_preferred is null
      or sp.hourly_rate_preferred <= maximum_hourly_rate
    )
  order by sp.average_rating desc, sp.ratings_count desc, sp.years_experience desc;
$$;

alter table public.profiles enable row level security;
alter table public.staff_profiles enable row level security;
alter table public.venues enable row level security;
alter table public.venue_memberships enable row level security;
alter table public.availability_slots enable row level security;
alter table public.shift_requests enable row level security;
alter table public.ratings enable row level security;
alter table public.staff_saved_by_venues enable row level security;

create policy "profiles_select_own_admin_and_basic_staff_search"
on public.profiles
for select
using (
  id = auth.uid()
  or public.is_admin()
  or role = 'staff'
);

create policy "profiles_insert_own"
on public.profiles
for insert
with check (id = auth.uid());

create policy "profiles_update_own_or_admin"
on public.profiles
for update
using (id = auth.uid() or public.is_admin())
with check (id = auth.uid() or public.is_admin());

create policy "staff_profiles_select_searchable"
on public.staff_profiles
for select
using (
  user_id = auth.uid()
  or public.is_admin()
  or approved_for_work = true
);

create policy "staff_profiles_insert_own"
on public.staff_profiles
for insert
with check (user_id = auth.uid());

create policy "staff_profiles_update_own_or_admin"
on public.staff_profiles
for update
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

create policy "staff_profiles_delete_admin_only"
on public.staff_profiles
for delete
using (public.is_admin());

create policy "venues_select_approved_members_or_admin"
on public.venues
for select
using (
  public.is_approved_venue_member(id)
  or public.is_admin()
);

create policy "venues_insert_venue_user"
on public.venues
for insert
with check (
  created_by = auth.uid()
  and public.is_venue_user()
);

create policy "venues_update_owners_managers_or_admin"
on public.venues
for update
using (
  public.is_venue_owner_or_manager(id)
  or public.is_admin()
)
with check (
  public.is_venue_owner_or_manager(id)
  or public.is_admin()
);

create policy "venues_delete_admin_only"
on public.venues
for delete
using (public.is_admin());

create policy "venue_memberships_select_related_or_admin"
on public.venue_memberships
for select
using (
  user_id = auth.uid()
  or public.is_approved_venue_member(venue_id)
  or public.is_admin()
);

create policy "venue_memberships_insert_self_or_owner_manager_admin"
on public.venue_memberships
for insert
with check (
  user_id = auth.uid()
  or public.is_venue_owner_or_manager(venue_id)
  or public.is_admin()
);

create policy "venue_memberships_update_owner_manager_admin"
on public.venue_memberships
for update
using (
  public.is_venue_owner_or_manager(venue_id)
  or public.is_admin()
)
with check (
  public.is_venue_owner_or_manager(venue_id)
  or public.is_admin()
);

create policy "venue_memberships_delete_owner_manager_admin"
on public.venue_memberships
for delete
using (
  public.is_venue_owner_or_manager(venue_id)
  or public.is_admin()
);

create policy "availability_select_own_or_available"
on public.availability_slots
for select
using (
  staff_user_id = auth.uid()
  or public.is_admin()
  or status = 'available'
);

create policy "availability_insert_own_staff"
on public.availability_slots
for insert
with check (
  staff_user_id = auth.uid()
  and public.is_staff()
);

create policy "availability_update_own_or_admin"
on public.availability_slots
for update
using (
  staff_user_id = auth.uid()
  or public.is_admin()
)
with check (
  staff_user_id = auth.uid()
  or public.is_admin()
);

create policy "availability_delete_own_or_admin"
on public.availability_slots
for delete
using (
  staff_user_id = auth.uid()
  or public.is_admin()
);

create policy "shift_requests_select_staff_or_venue_member_or_admin"
on public.shift_requests
for select
using (
  staff_user_id = auth.uid()
  or public.is_approved_venue_member(venue_id)
  or public.is_admin()
);

create policy "shift_requests_insert_approved_venue_member"
on public.shift_requests
for insert
with check (
  created_by = auth.uid()
  and public.is_approved_venue_member(venue_id)
  and public.staff_has_available_slot(staff_user_id, starts_at, ends_at)
);

create policy "shift_requests_update_staff_or_venue_member_or_admin"
on public.shift_requests
for update
using (
  staff_user_id = auth.uid()
  or public.is_approved_venue_member(venue_id)
  or public.is_admin()
)
with check (
  staff_user_id = auth.uid()
  or public.is_approved_venue_member(venue_id)
  or public.is_admin()
);

create policy "shift_requests_delete_admin_only"
on public.shift_requests
for delete
using (public.is_admin());

create policy "ratings_select_staff_or_venue_member_or_admin"
on public.ratings
for select
using (
  staff_user_id = auth.uid()
  or public.is_approved_venue_member(venue_id)
  or public.is_admin()
);

create policy "ratings_insert_completed_shift_venue_member"
on public.ratings
for insert
with check (
  rated_by = auth.uid()
  and public.is_approved_venue_member(venue_id)
  and exists (
    select 1
    from public.shift_requests sr
    where sr.id = shift_request_id
      and sr.status = 'completed'
      and sr.venue_id = ratings.venue_id
      and sr.staff_user_id = ratings.staff_user_id
  )
);

create policy "ratings_update_admin_only"
on public.ratings
for update
using (public.is_admin())
with check (public.is_admin());

create policy "ratings_delete_admin_only"
on public.ratings
for delete
using (public.is_admin());

create policy "saved_staff_select_venue_members_or_admin"
on public.staff_saved_by_venues
for select
using (
  public.is_approved_venue_member(venue_id)
  or public.is_admin()
);

create policy "saved_staff_insert_venue_members"
on public.staff_saved_by_venues
for insert
with check (
  created_by = auth.uid()
  and public.is_approved_venue_member(venue_id)
);

create policy "saved_staff_delete_venue_members_or_admin"
on public.staff_saved_by_venues
for delete
using (
  public.is_approved_venue_member(venue_id)
  or public.is_admin()
);

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'certificates',
  'certificates',
  false,
  10485760,
  array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp'
  ]
)
on conflict (id) do nothing;

create policy "certificate_upload_own_folder"
on storage.objects
for insert
with check (
  bucket_id = 'certificates'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "certificate_read_own_or_admin"
on storage.objects
for select
using (
  bucket_id = 'certificates'
  and (
    auth.uid()::text = (storage.foldername(name))[1]
    or public.is_admin()
  )
);

create policy "certificate_update_own_or_admin"
on storage.objects
for update
using (
  bucket_id = 'certificates'
  and (
    auth.uid()::text = (storage.foldername(name))[1]
    or public.is_admin()
  )
)
with check (
  bucket_id = 'certificates'
  and (
    auth.uid()::text = (storage.foldername(name))[1]
    or public.is_admin()
  )
);

create policy "certificate_delete_own_or_admin"
on storage.objects
for delete
using (
  bucket_id = 'certificates'
  and (
    auth.uid()::text = (storage.foldername(name))[1]
    or public.is_admin()
  )
);

commit;
