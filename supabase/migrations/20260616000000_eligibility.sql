-- Run this in the Supabase SQL editor to create the eligibility tables.
-- The dashboard uses the service role key, which bypasses RLS.

create table if not exists patients (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  dob date,
  gender text,
  member_id text,
  group_number text,
  created_at timestamptz not null default now()
);

create table if not exists eligibility_checks (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid references patients(id),
  patient_first_name text,
  patient_last_name text,
  patient_dob date,
  payer_id text,
  payer_name text,
  member_id text,
  group_number text,
  npi text,
  pos_code text,
  dos date,
  stc text,
  status text,
  plan_name text,
  plan_begin_date date,
  plan_end_date date,
  copay_in_net numeric,
  deduct_rem_in_net numeric,
  oop_max_rem_in_net numeric,
  coins_in_net numeric,
  auth_required text,
  referral_required text,
  subscriber_name_match boolean,
  trn text,
  stedi_eligibility_id text,
  raw_271 jsonb,
  checked_at timestamptz not null default now()
);

create table if not exists eligibility_batches (
  id uuid primary key default gen_random_uuid(),
  stedi_batch_id text,
  status text not null default 'submitted',
  total_count int not null default 0,
  complete_count int not null default 0,
  active_count int not null default 0,
  inactive_count int not null default 0,
  error_count int not null default 0,
  submitted_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists work_queue (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  patient_first_name text,
  patient_last_name text,
  payer_id text,
  payer_name text,
  dos date,
  reason text,
  resolved boolean not null default false,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);
