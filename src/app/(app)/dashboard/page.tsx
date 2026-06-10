import type { Metadata } from 'next'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { CURRENT_SEASON } from '@/lib/utils/constants'
import { getSession, getSessionProgress, getSessionDashboard } from '@/lib/data/full-season'
import { getPlayoffBracket, getPlayoffPicks } from '@/lib/data/playoff'
import ShareButton from '@/components/ShareButton'

export const metadata: Metadata = { title: 'Dashboard' }

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', user.id)
    .single()

  const name = profile?.display_name ?? user.email?.split('@')[0] ?? 'You'

  // ── Fetch user's prediction state across all 3 modes ──────────────

  const [fsSession, playoffBracket, trackerRows, weeklyPicksRes] = await Promise.all([
    getSession(user.id),
    getPlayoffBracket(user.id, CURRENT_SEASON),
    supabase
      .from('team_tracker_picks')
      .select('team_id, winner_team_id, game_id')
      .eq('user_id', user.id)
      .eq('season', CURRENT_SEASON),
    supabase
      .from('predictions_game')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id),
  ])

  const [fsProgress, fsConferences, playoffPicks] = await Promise.all([
    fsSession ? getSessionProgress(fsSession.id) : Promise.resolve(null),
    fsSession ? getSessionDashboard(fsSession.id) : Promise.resolve([]),
    playoffBracket ? getPlayoffPicks(playoffBracket.id) : Promise.resolve([]),
  ])

  // Build tracked teams summary
  const trackerByTeam = new Map<string, { pickCount: number }>()
  for (const r of trackerRows.data ?? []) {
    const existing = trackerByTeam.get(r.team_id) ?? { pickCount: 0 }
    trackerByTeam.set(r.team_id, { pickCount: existing.pickCount + 1 })
  }

  // Fetch team info for tracker teams
  const trackerTeamIds = [...trackerByTeam.keys()]
  const { data: trackerTeamRows } = trackerTeamIds.length > 0
    ? await supabase
        .from('teams')
        .select('id, name, abbreviation, logo_url, color')
        .in('id', trackerTeamIds)
    : { data: [] }

  const trackerTeams = (trackerTeamRows ?? []).map(t => ({
    ...t,
    pickCount: trackerByTeam.get(t.id)?.pickCount ?? 0,
  }))

  const weeklyPickCount = weeklyPicksRes.count ?? 0
  const hasAnyPredictions = !!fsSession || trackerTeamIds.length > 0 || !!playoffBracket || weeklyPickCount > 0

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://thepredictionsheet.com'

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="mb-10">
        <h1 className="text-3xl font-black">Dashboard</h1>
        <p className="text-zinc-500 mt-1">Welcome back, {name} — your {CURRENT_SEASON} CFB picks.</p>
      </div>

      {!hasAnyPredictions ? (
        /* ── Empty state ── */
        <div className="rounded-2xl border-2 border-dashed border-zinc-200 p-12 text-center">
          <p className="text-zinc-400 font-medium mb-2">No predictions yet</p>
          <p className="text-sm text-zinc-400 mb-6">
            Head to the CFB Hub to start making picks.
          </p>
          <Link
            href="/cfb"
            className="inline-block px-6 py-3 bg-[#84cc16] text-black font-bold rounded-xl hover:bg-[#65a30d] transition-colors"
          >
            Go to CFB Hub →
          </Link>
        </div>
      ) : (
        <div className="space-y-6">

          {/* ── Full Season Mode ── */}
          {fsSession && fsProgress ? (
            <section>
              <SectionLabel action={
                <ShareButton
                  text={`I've predicted ${fsProgress.games_predicted}/${fsProgress.games_total} CFB games in Full Season Mode this season on The Prediction Sheet 🏈`}
                  url={`${appUrl}/cfb/full-season`}
                />
              }>Full Season Mode</SectionLabel>
              <Link
                href="/cfb/full-season"
                className="flex items-center gap-5 p-5 rounded-2xl bg-black text-white hover:bg-zinc-900 transition-all group"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap gap-2 mb-2">
                    {fsConferences.slice(0, 5).map(c => (
                      <span key={c.id} className="text-[10px] font-bold text-zinc-400 uppercase tracking-wide">
                        {c.abbreviation}
                      </span>
                    ))}
                    {fsConferences.length > 5 && (
                      <span className="text-[10px] text-zinc-500">+{fsConferences.length - 5} more</span>
                    )}
                  </div>
                  <p className="font-black text-lg leading-tight">
                    {fsProgress.games_predicted} / {fsProgress.games_total} games picked
                  </p>
                  {fsProgress.games_total > 0 && (
                    <div className="mt-2 h-1 bg-white/10 rounded-full overflow-hidden max-w-xs">
                      <div
                        className="h-full bg-[#84cc16] rounded-full"
                        style={{ width: `${Math.min(100, (fsProgress.games_predicted / fsProgress.games_total) * 100)}%` }}
                      />
                    </div>
                  )}
                </div>
                <span className="text-[#84cc16] text-xl font-black group-hover:translate-x-1 transition-transform shrink-0">→</span>
              </Link>
            </section>
          ) : (
            <section>
              <SectionLabel>Full Season Mode</SectionLabel>
              <ModeStartCard
                title="Start Full Season Mode"
                desc="Pick every game for your selected conferences. Your picks flow into standings, conf champs, and your CFP bracket."
                href="/cfb/full-season"
              />
            </section>
          )}

          {/* ── Weekly Pick'em ── */}
          <section>
            <SectionLabel action={weeklyPickCount > 0 ? (
              <ShareButton
                text={`I've made ${weeklyPickCount} game pick${weeklyPickCount !== 1 ? 's' : ''} in CFB Weekly Pick'em on The Prediction Sheet 📋 Come compete with me!`}
                url={`${appUrl}/cfb/game-picks`}
              />
            ) : undefined}>Weekly Pick&apos;em</SectionLabel>
            {weeklyPickCount > 0 ? (
              <Link
                href="/cfb/game-picks"
                className="flex items-center gap-5 p-5 rounded-2xl border border-zinc-200 hover:border-[#84cc16] hover:shadow-sm bg-white transition-all group"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-black text-lg">{weeklyPickCount} game{weeklyPickCount !== 1 ? 's' : ''} picked</p>
                  <p className="text-xs text-zinc-400 mt-0.5">Earn points each week for correct picks.</p>
                </div>
                <span className="text-zinc-400 text-xl font-black group-hover:text-[#84cc16] group-hover:translate-x-1 transition-all shrink-0">→</span>
              </Link>
            ) : (
              <ModeStartCard
                title="Make Your Weekly Picks"
                desc="Pick winners across every FBS game each week. Earn points for correct picks and climb the leaderboard."
                href="/cfb/game-picks"
              />
            )}
          </section>

          {/* ── Team Season Tracker ── */}
          <section>
            <SectionLabel action={trackerTeams.length > 0 ? (
              <ShareButton
                text={`Tracking ${trackerTeams.map(t => t.name).join(', ')} on The Prediction Sheet this CFB season 📊`}
                url={`${appUrl}/cfb/team-tracker`}
              />
            ) : undefined}>Team Season Tracker</SectionLabel>
            {trackerTeams.length === 0 ? (
              <ModeStartCard
                title="Track a Team"
                desc="Follow any FBS team all season — predict their results week by week and see how accurate your picks are."
                href="/cfb/team-tracker"
              />
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {trackerTeams.map(team => (
                    <Link
                      key={team.id}
                      href={`/cfb/team-tracker/${team.id}`}
                      className="flex items-center gap-3 p-4 rounded-xl border border-zinc-200 hover:border-[#84cc16] hover:shadow-sm bg-white transition-all"
                    >
                      {team.logo_url ? (
                        <img src={team.logo_url} alt={team.name} className="w-9 h-9 object-contain shrink-0" />
                      ) : (
                        <div className="w-9 h-9 rounded-full shrink-0" style={{ backgroundColor: team.color ? `#${team.color}` : '#e4e4e7' }} />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-sm truncate">{team.name}</p>
                        <p className="text-xs text-zinc-400 mt-0.5">{team.pickCount} game{team.pickCount !== 1 ? 's' : ''} picked</p>
                      </div>
                      <span className="text-zinc-400 text-sm font-bold shrink-0">→</span>
                    </Link>
                  ))}
                </div>
                <Link
                  href="/cfb/team-tracker"
                  className="inline-block text-xs font-semibold text-zinc-400 hover:text-[#65a30d] transition-colors px-1 pt-1"
                >
                  + Track another team
                </Link>
              </div>
            )}
          </section>

          {/* ── CFP Playoff Bracket ── */}
          <section>
            <SectionLabel action={playoffBracket && playoffBracket.seedings.length > 0 ? (
              <ShareButton
                text={`Just called ${playoffPicks.length}/11 games in my 12-team CFP bracket on The Prediction Sheet 🏆${playoffPicks.length === 11 ? ' — champion locked in!' : ''}`}
                url={`${appUrl}/cfb/playoff`}
              />
            ) : undefined}>CFP Bracket</SectionLabel>
            {!playoffBracket || playoffBracket.seedings.length === 0 ? (
              <ModeStartCard
                title="Build Your CFP Bracket"
                desc="Generate a 12-team bracket via simulation or pick your teams manually — then predict round by round."
                href="/cfb/playoff"
              />
            ) : (
              <Link
                href="/cfb/playoff"
                className="flex items-center gap-5 p-5 rounded-2xl border border-zinc-200 hover:border-[#84cc16] hover:shadow-sm bg-white transition-all group"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-zinc-400 uppercase tracking-wide mb-1">
                    {playoffBracket.setup_mode === 'sim' ? 'Simulated bracket' : 'Manual bracket'}
                  </p>
                  <p className="font-black text-lg">
                    {playoffPicks.length} / 11 games picked
                    {playoffPicks.length === 11 && (
                      <span className="ml-2 text-[#65a30d] font-normal text-base">· Champion locked in</span>
                    )}
                  </p>
                  {playoffBracket.seedings.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {playoffBracket.seedings.slice(0, 4).map(s => (
                        <div key={s.team_id} className="flex items-center gap-1">
                          {s.team_logo && <img src={s.team_logo} alt={s.team_name} className="w-3.5 h-3.5 object-contain" />}
                          <span className="text-[10px] text-zinc-400 font-semibold">{s.team_abbr ?? s.team_name}</span>
                        </div>
                      ))}
                      <span className="text-[10px] text-zinc-300">+ 8 more</span>
                    </div>
                  )}
                </div>
                <span className="text-zinc-400 text-xl font-black group-hover:text-[#84cc16] group-hover:translate-x-1 transition-all shrink-0">→</span>
              </Link>
            )}
          </section>

        </div>
      )}

      {/* ── Quick link to hub ── */}
      {hasAnyPredictions && (
        <div className="mt-10 pt-6 border-t border-zinc-100 flex items-center justify-between">
          <p className="text-sm text-zinc-400">Start a new prediction mode</p>
          <Link href="/cfb" className="text-sm font-bold text-zinc-600 hover:text-[#65a30d] transition-colors">
            CFB Hub →
          </Link>
        </div>
      )}
    </div>
  )
}

function SectionLabel({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">{children}</p>
      {action}
    </div>
  )
}

function ModeStartCard({ title, desc, href }: { title: string; desc: string; href: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-4 p-5 rounded-2xl border-2 border-dashed border-zinc-200 hover:border-[#84cc16] hover:bg-zinc-50 transition-all group"
    >
      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm text-zinc-700">{title}</p>
        <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">{desc}</p>
      </div>
      <span className="text-zinc-300 font-bold text-lg group-hover:text-[#84cc16] transition-colors shrink-0">→</span>
    </Link>
  )
}
