-- ================================================================
-- CFP Conference Championship Games — migration
-- Run in Supabase SQL Editor after cfp_migration.sql
-- ================================================================

-- One row per conference per bracket.
-- team_a = #1 seed in conference, team_b = #2 seed.
-- All display data (names, logos, records) is denormalized in for fast reads.

create table if not exists public.cfp_conf_champ_games (
  id                  uuid primary key default uuid_generate_v4(),
  bracket_id          uuid not null references public.cfp_brackets(id) on delete cascade,
  conference_id       uuid not null references public.conferences(id),
  conference_name     text not null,
  conference_abbr     text not null,
  team_a_id           uuid references public.teams(id),
  team_b_id           uuid references public.teams(id),
  team_a_name         text not null default '',
  team_b_name         text not null default '',
  team_a_abbr         text,
  team_b_abbr         text,
  team_a_logo         text,
  team_b_logo         text,
  team_a_color        text,
  team_b_color        text,
  team_a_wins         integer not null default 0,
  team_a_losses       integer not null default 0,
  team_b_wins         integer not null default 0,
  team_b_losses       integer not null default 0,
  team_a_conf_wins    integer not null default 0,
  team_a_conf_losses  integer not null default 0,
  team_b_conf_wins    integer not null default 0,
  team_b_conf_losses  integer not null default 0,
  winner_team_id      uuid references public.teams(id),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique(bracket_id, conference_id)
);

create index if not exists idx_cfp_cchamp_bracket on public.cfp_conf_champ_games(bracket_id);

alter table public.cfp_conf_champ_games enable row level security;

create policy "cfp_cchamp_all_own" on public.cfp_conf_champ_games
  for all using (
    exists (
      select 1 from public.cfp_brackets cb
      join public.full_season_sessions fss on fss.id = cb.session_id
      where cb.id = bracket_id and fss.user_id = auth.uid()
    )
  );
