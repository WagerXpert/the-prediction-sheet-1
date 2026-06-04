-- ================================================================
-- Full Season Mode — migration
-- Run this in your Supabase SQL Editor after schema.sql
-- ================================================================

-- ── Full Season Sessions ──────────────────────────────────────────
-- One session per user per sport per season (they can have multiple
-- but the app surfaces only the most recent one for now).

create table if not exists public.full_season_sessions (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  sport_id   text not null references public.sports(id),
  season     integer not null,
  name       text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_fss_user_sport_season
  on public.full_season_sessions(user_id, sport_id, season);

-- ── Full Season Conferences ───────────────────────────────────────
-- Which conferences the user included in their simulation.

create table if not exists public.full_season_conferences (
  session_id    uuid not null references public.full_season_sessions(id) on delete cascade,
  conference_id uuid not null references public.conferences(id) on delete cascade,
  primary key (session_id, conference_id)
);

-- ── Full Season Predictions ───────────────────────────────────────
-- Single source of truth: one predicted winner per game per session.
-- Updating from either team's schedule changes the same row.

create table if not exists public.full_season_predictions (
  id             uuid primary key default uuid_generate_v4(),
  session_id     uuid not null references public.full_season_sessions(id) on delete cascade,
  game_id        uuid not null references public.games(id) on delete cascade,
  winner_team_id uuid not null references public.teams(id) on delete cascade,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint unique_session_game unique (session_id, game_id)
);

create index if not exists idx_fsp_session on public.full_season_predictions(session_id);
create index if not exists idx_fsp_game    on public.full_season_predictions(game_id);

-- ── Row Level Security ────────────────────────────────────────────

alter table public.full_season_sessions    enable row level security;
alter table public.full_season_conferences enable row level security;
alter table public.full_season_predictions enable row level security;

create policy "fss_all_own" on public.full_season_sessions
  for all using (auth.uid() = user_id);

create policy "fsc_all_own" on public.full_season_conferences
  for all using (
    exists (
      select 1 from public.full_season_sessions
      where id = session_id and user_id = auth.uid()
    )
  );

create policy "fsp_all_own" on public.full_season_predictions
  for all using (
    exists (
      select 1 from public.full_season_sessions
      where id = session_id and user_id = auth.uid()
    )
  );
