-- ============================================================
-- Email notifications: reminder opt-out + settled-week tracking
-- Run this in your Supabase SQL Editor.
-- ============================================================

-- Lets a user turn off pick'em reminder/results emails from their profile.
alter table public.profiles
  add column if not exists email_reminders_opt_in boolean not null default true;

-- Tracks which (sport, season, week) have already had "results settled"
-- emails sent, so the hourly sync doesn't re-notify every run.
create table if not exists public.week_notifications (
  id           uuid primary key default uuid_generate_v4(),
  sport_id     text not null references public.sports(id),
  season       integer not null,
  week         integer not null,
  notified_at  timestamptz not null default now(),
  unique (sport_id, season, week)
);

alter table public.week_notifications enable row level security;
create policy "week_notifications_admin_only" on public.week_notifications for select
  using (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true));
