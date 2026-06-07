-- ================================================================
-- Team Season Tracker + Standalone Playoff Mode — migration
-- Run in Supabase SQL Editor
-- ================================================================

-- ── Team Season Tracker ───────────────────────────────────────────
-- One pick per user per game; no full-season session required.

create table if not exists public.team_tracker_picks (
  id             uuid primary key default uuid_generate_v4(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  team_id        uuid not null references public.teams(id),
  game_id        uuid not null references public.games(id),
  winner_team_id uuid not null references public.teams(id),
  season         integer not null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique(user_id, game_id)
);

create index if not exists idx_ttp_user_team_season
  on public.team_tracker_picks(user_id, team_id, season);

-- ── Standalone Playoff Mode ───────────────────────────────────────
-- CFP bracket without requiring a full-season session.

create table if not exists public.standalone_playoff_brackets (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  season      integer not null,
  seedings    jsonb not null default '[]'::jsonb,
  setup_mode  text not null default 'sim' check (setup_mode in ('sim', 'manual')),
  sim_seed    text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique(user_id, season)
);

create index if not exists idx_spb_user_season
  on public.standalone_playoff_brackets(user_id, season);

create table if not exists public.standalone_playoff_picks (
  id             uuid primary key default uuid_generate_v4(),
  bracket_id     uuid not null references public.standalone_playoff_brackets(id) on delete cascade,
  round          integer not null check (round between 1 and 4),
  game_index     integer not null check (game_index >= 0),
  winner_team_id uuid not null references public.teams(id),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique(bracket_id, round, game_index)
);

create index if not exists idx_spp_bracket
  on public.standalone_playoff_picks(bracket_id);

-- ── Row Level Security ────────────────────────────────────────────

alter table public.team_tracker_picks           enable row level security;
alter table public.standalone_playoff_brackets  enable row level security;
alter table public.standalone_playoff_picks     enable row level security;

create policy "ttp_own" on public.team_tracker_picks
  for all using (user_id = auth.uid());

create policy "spb_own" on public.standalone_playoff_brackets
  for all using (user_id = auth.uid());

create policy "spp_own" on public.standalone_playoff_picks
  for all using (
    exists (
      select 1 from public.standalone_playoff_brackets spb
      where spb.id = bracket_id and spb.user_id = auth.uid()
    )
  );
