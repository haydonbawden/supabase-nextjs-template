-- Optional demo seed for HospoShift WA. Do not run in production.
-- Requires matching users to already exist in auth.users with the emails below.

begin;

with demo_users as (
  select id, email from auth.users
  where email in (
    'admin@hosposhiftwa.demo',
    'venue1@hosposhiftwa.demo',
    'venue2@hosposhiftwa.demo',
    'staff1@hosposhiftwa.demo',
    'staff2@hosposhiftwa.demo',
    'staff3@hosposhiftwa.demo',
    'staff4@hosposhiftwa.demo',
    'staff5@hosposhiftwa.demo',
    'staff6@hosposhiftwa.demo'
  )
), upsert_profiles as (
  insert into public.profiles (id, role, full_name, suburb, postcode, state, phone)
  select
    id,
    case
      when email = 'admin@hosposhiftwa.demo' then 'admin'::public.user_role
      when email like 'venue%@hosposhiftwa.demo' then 'venue_user'::public.user_role
      else 'staff'::public.user_role
    end,
    split_part(email, '@', 1),
    case
      when email like 'staff1%' then 'Perth'
      when email like 'staff2%' then 'Fremantle'
      when email like 'staff3%' then 'Subiaco'
      when email like 'staff4%' then 'Mount Lawley'
      when email like 'staff5%' then 'Leederville'
      when email like 'staff6%' then 'Northbridge'
      else 'Perth'
    end,
    '6000',
    'WA',
    '0400000000'
  from demo_users
  on conflict (id) do update set
    role = excluded.role,
    full_name = excluded.full_name,
    suburb = excluded.suburb,
    postcode = excluded.postcode,
    state = excluded.state
  returning id
), upsert_staff as (
  insert into public.staff_profiles (
    user_id, bio, years_experience, rsa_certificate, rsa_certificate_verified,
    food_safety_certificate, approved_for_work, roles, preferred_suburbs,
    hourly_rate_min, hourly_rate_preferred, average_rating, ratings_count
  )
  select
    p.id,
    'Reliable hospo professional ready for casual shifts across WA.',
    (random() * 8)::numeric(4,1),
    random() > 0.2,
    random() > 0.4,
    random() > 0.35,
    true,
    case
      when pr.email like 'staff1%' then array['bartender','waiter']::public.hospitality_role[]
      when pr.email like 'staff2%' then array['barista','host']::public.hospitality_role[]
      when pr.email like 'staff3%' then array['chef','kitchen_hand']::public.hospitality_role[]
      when pr.email like 'staff4%' then array['runner','waiter']::public.hospitality_role[]
      when pr.email like 'staff5%' then array['duty_manager','bartender']::public.hospitality_role[]
      else array['dishwasher','kitchen_hand']::public.hospitality_role[]
    end,
    array['Perth','Fremantle','Subiaco'],
    28,
    34,
    (3 + random() * 2)::numeric(3,2),
    (1 + random() * 40)::int
  from public.profiles p
  join auth.users pr on pr.id = p.id
  where p.role = 'staff'
  on conflict (user_id) do update set
    approved_for_work = true,
    roles = excluded.roles,
    preferred_suburbs = excluded.preferred_suburbs,
    hourly_rate_preferred = excluded.hourly_rate_preferred
  returning user_id
), venue_rows as (
  insert into public.venues (name, venue_type, suburb, postcode, state, liquor_licensed, created_by, address)
  select 'Perth CBD Bar', 'bar', 'Perth', '6000', 'WA', true, p.id, '100 St Georges Terrace, Perth WA'
  from public.profiles p join auth.users u on u.id = p.id where u.email = 'venue1@hosposhiftwa.demo'
  union all
  select 'Fremantle Restaurant', 'restaurant', 'Fremantle', '6160', 'WA', true, p.id, '20 Market St, Fremantle WA'
  from public.profiles p join auth.users u on u.id = p.id where u.email = 'venue1@hosposhiftwa.demo'
  union all
  select 'Subiaco Cafe', 'cafe', 'Subiaco', '6008', 'WA', false, p.id, '55 Rokeby Rd, Subiaco WA'
  from public.profiles p join auth.users u on u.id = p.id where u.email = 'venue2@hosposhiftwa.demo'
  on conflict do nothing
  returning id
)
select count(*) from venue_rows;

insert into public.availability_slots (staff_user_id, starts_at, ends_at, status, notes)
select p.id, now() + interval '1 day', now() + interval '1 day 8 hours', 'available', 'Day shift'
from public.profiles p
where p.role = 'staff'
on conflict do nothing;

commit;
