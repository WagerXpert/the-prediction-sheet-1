-- ============================================================
-- THE PREDICTION SHEET — Supabase Schema
-- Run this in your Supabase SQL Editor to set up the database.
-- ============================================================

-- ── Extensions ───────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ── Sports ───────────────────────────────────────────────
-- Lookup table. Drives multi-sport routing and filtering.
-- Adding a new sport = one INSERT here + sync its data.

create table if not exists public.sports (
  id           text primary key,          -- 'cfb', 'nfl', 'nba', 'mlb'
  name         text not null,             -- 'College Football'
  abbreviation text not null,             -- 'CFB'
  is_active    boolean not null default false,
  created_at   timestamptz not null default now()
);

insert into public.sports (id, name, abbreviation, is_active) values
  ('cfb', 'College Football', 'CFB', true),
  ('nfl', 'NFL',              'NFL', false),
  ('nba', 'NBA',              'NBA', false),
  ('mlb', 'MLB',              'MLB', false)
on conflict (id) do nothing;

-- ── Conferences ───────────────────────────────────────────
create table if not exists public.conferences (
  id           uuid primary key default uuid_generate_v4(),
  sport_id     text not null references public.sports(id),
  external_id  text,                       -- CFBD conference abbreviation
  name         text not null,
  abbreviation text not null,
  created_at   timestamptz not null default now(),
  unique (sport_id, external_id)
);

create index if not exists idx_conferences_sport on public.conferences(sport_id);

-- ── Teams ─────────────────────────────────────────────────
create table if not exists public.teams (
  id            uuid primary key default uuid_generate_v4(),
  sport_id      text not null references public.sports(id),
  conference_id uuid references public.conferences(id),
  external_id   text,                      -- CFBD team id (as text)
  name          text not null,             -- 'Ohio State'
  abbreviation  text,                      -- 'OSU'
  mascot        text,                      -- 'Buckeyes'
  logo_url      text,
  color         text,                      -- primary hex color (no #)
  alt_color     text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (sport_id, external_id)
);

create index if not exists idx_teams_sport       on public.teams(sport_id);
create index if not exists idx_teams_conference  on public.teams(conference_id);

-- ── Games ─────────────────────────────────────────────────
create table if not exists public.games (
  id               uuid primary key default uuid_generate_v4(),
  sport_id         text not null references public.sports(id),
  external_id      bigint,                 -- CFBD game id
  season           integer not null,       -- 2026
  season_type      text not null default 'regular',  -- 'regular', 'postseason'
  week             integer,                -- 1–15, null for bowls
  game_date        timestamptz,
  home_team_id     uuid references public.teams(id),
  away_team_id     uuid references public.teams(id),
  home_team_points integer,
  away_team_points integer,
  status           text not null default 'scheduled',
  -- 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
  neutral_site     boolean default false,
  conference_game  boolean default false,
  notes            text,                   -- bowl game name, etc.
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (sport_id, external_id)
);

create index if not exists idx_games_sport_season_week on public.games(sport_id, season, week);
create index if not exists idx_games_status            on public.games(status);
create index if not exists idx_games_date              on public.games(game_date);

-- ── User Profiles ─────────────────────────────────────────
-- Extends auth.users (one row per auth user, created by trigger)

create table if not exists public.profiles (
  id               uuid primary key references auth.users(id) on delete cascade,
  username         text unique,
  display_name     text,
  avatar_url       text,
  bio              text,
  favorite_team_id uuid references public.teams(id),
  is_admin         boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── Prediction Sets ───────────────────────────────────────
-- One per user per sport per season — the user's "sheet"

create table if not exists public.prediction_sets (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  sport_id     text not null references public.sports(id),
  season       integer not null,
  name         text,                       -- e.g. "My 2026 CFB Sheet"
  is_locked    boolean not null default false,
  submitted_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (user_id, sport_id, season)
);

create index if not exists idx_prediction_sets_user        on public.prediction_sets(user_id);
create index if not exists idx_prediction_sets_sport_season on public.prediction_sets(sport_id, season);

-- ── Predictions: Game Winner ──────────────────────────────
create table if not exists public.predictions_game (
  id                uuid primary key default uuid_generate_v4(),
  prediction_set_id uuid not null references public.prediction_sets(id) on delete cascade,
  user_id           uuid not null references public.profiles(id) on delete cascade,
  game_id           uuid not null references public.games(id),
  picked_team_id    uuid not null references public.teams(id),
  confidence        smallint check (confidence between 1 and 5),
  is_correct        boolean,               -- null until game completes
  points_awarded    numeric(5,2) default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (prediction_set_id, game_id)
);

create index if not exists idx_pred_game_user on public.predictions_game(user_id);
create index if not exists idx_pred_game_game on public.predictions_game(game_id);

-- ── Predictions: Season Record ────────────────────────────
create table if not exists public.predictions_record (
  id                uuid primary key default uuid_generate_v4(),
  prediction_set_id uuid not null references public.prediction_sets(id) on delete cascade,
  user_id           uuid not null references public.profiles(id) on delete cascade,
  team_id           uuid not null references public.teams(id),
  predicted_wins    smallint not null check (predicted_wins >= 0),
  predicted_losses  smallint not null check (predicted_losses >= 0),
  actual_wins       smallint,
  actual_losses     smallint,
  is_correct        boolean,               -- exact match bonus
  points_awarded    numeric(5,2) default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (prediction_set_id, team_id)
);

create index if not exists idx_pred_record_user on public.predictions_record(user_id);
create index if not exists idx_pred_record_team on public.predictions_record(team_id);

-- ── Predictions: Conference Standings ────────────────────
create table if not exists public.predictions_standings (
  id                uuid primary key default uuid_generate_v4(),
  prediction_set_id uuid not null references public.prediction_sets(id) on delete cascade,
  user_id           uuid not null references public.profiles(id) on delete cascade,
  conference_id     uuid not null references public.conferences(id),
  team_id           uuid not null references public.teams(id),
  predicted_rank    smallint not null,    -- 1 = predicted winner
  actual_rank       smallint,
  points_awarded    numeric(5,2) default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (prediction_set_id, conference_id, team_id),
  unique (prediction_set_id, conference_id, predicted_rank)
);

create index if not exists idx_pred_standings_user on public.predictions_standings(user_id);
create index if not exists idx_pred_standings_conf on public.predictions_standings(conference_id);

-- ── Sync Log ──────────────────────────────────────────────
create table if not exists public.sync_log (
  id               uuid primary key default uuid_generate_v4(),
  sport_id         text not null references public.sports(id),
  sync_type        text not null,          -- 'teams', 'games', 'conferences', 'results'
  season           integer,
  week             integer,
  status           text not null,          -- 'success', 'error'
  records_affected integer,
  error_message    text,
  synced_at        timestamptz not null default now()
);

-- ── Row Level Security ────────────────────────────────────

-- Sports, Conferences, Teams, Games — public read, no user writes
alter table public.sports       enable row level security;
alter table public.conferences  enable row level security;
alter table public.teams        enable row level security;
alter table public.games        enable row level security;
alter table public.sync_log     enable row level security;

create policy "sports_select_all"      on public.sports       for select using (true);
create policy "conferences_select_all" on public.conferences  for select using (true);
create policy "teams_select_all"       on public.teams        for select using (true);
create policy "games_select_all"       on public.games        for select using (true);
create policy "sync_log_admin_only"    on public.sync_log     for select
  using (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true));

-- Profiles — public read, self-update
alter table public.profiles enable row level security;
create policy "profiles_select_all"  on public.profiles for select using (true);
create policy "profiles_insert_own"  on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update_own"  on public.profiles for update using (auth.uid() = id);

-- Prediction sets — public read, self-insert/update (locked sets can't be updated)
alter table public.prediction_sets enable row level security;
create policy "pred_sets_select_all"  on public.prediction_sets for select using (true);
create policy "pred_sets_insert_own"  on public.prediction_sets for insert
  with check (auth.uid() = user_id);
create policy "pred_sets_update_own"  on public.prediction_sets for update
  using (auth.uid() = user_id and is_locked = false);

-- Game predictions — public read, self-write (set must not be locked)
alter table public.predictions_game enable row level security;
create policy "pred_game_select_all"  on public.predictions_game for select using (true);
create policy "pred_game_insert_own"  on public.predictions_game for insert
  with check (
    auth.uid() = user_id and
    exists (select 1 from public.prediction_sets ps
            where ps.id = prediction_set_id and ps.user_id = auth.uid() and ps.is_locked = false)
  );
create policy "pred_game_update_own"  on public.predictions_game for update
  using (
    auth.uid() = user_id and
    exists (select 1 from public.prediction_sets ps
            where ps.id = prediction_set_id and ps.user_id = auth.uid() and ps.is_locked = false)
  );

-- Record predictions
alter table public.predictions_record enable row level security;
create policy "pred_record_select_all" on public.predictions_record for select using (true);
create policy "pred_record_insert_own" on public.predictions_record for insert
  with check (auth.uid() = user_id);
create policy "pred_record_update_own" on public.predictions_record for update
  using (auth.uid() = user_id);

-- Standings predictions
alter table public.predictions_standings enable row level security;
create policy "pred_standings_select_all" on public.predictions_standings for select using (true);
create policy "pred_standings_insert_own" on public.predictions_standings for insert
  with check (auth.uid() = user_id);
create policy "pred_standings_update_own" on public.predictions_standings for update
  using (auth.uid() = user_id);
