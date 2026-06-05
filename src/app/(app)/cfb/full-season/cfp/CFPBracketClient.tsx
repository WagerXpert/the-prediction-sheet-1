'use client'

import { useState, useTransition } from 'react'
import type { CFPBracket, CFPPick, CFPSeed, CFPRankedTeam } from '@/lib/data/cfp'
import { buildBracketGames, FEEDS_INTO } from '@/lib/cfp/selection'
import { saveCFPPickAction, clearCFPPicksAction, regenerateBracketAction, saveCustomBracketAction } from './actions'
import { generateCFPField } from '@/lib/cfp/selection'

interface Props {
  bracket: CFPBracket
  initialPicks: CFPPick[]
  sessionId: string
}

// ── Team card used inside a game box ──────────────────────────────

function TeamSlot({
  seed,
  isPicked,
  canPick,
  source,
  onClick,
}: {
  seed: CFPSeed | null
  isPicked: boolean
  canPick: boolean
  source?: string
  onClick: () => void
}) {
  const base = 'flex items-center gap-2 px-3 py-2.5 w-full text-left transition-all min-h-[46px]'
  const style = isPicked
    ? `${base} bg-[#84cc16]/20 text-[#3f6212]`
    : canPick && seed
      ? `${base} hover:bg-zinc-50 cursor-pointer`
      : `${base} cursor-default`

  if (!seed) {
    return (
      <div className={`${base} text-zinc-400 text-xs italic`}>
        {source ?? 'TBD'}
      </div>
    )
  }

  return (
    <button onClick={onClick} disabled={!canPick} className={style}>
      {seed.team_logo ? (
        <img src={seed.team_logo} alt={seed.team_name} className="w-5 h-5 object-contain shrink-0" />
      ) : (
        <div
          className="w-5 h-5 rounded-full shrink-0"
          style={{ backgroundColor: seed.team_color ? `#${seed.team_color}` : '#e4e4e7' }}
        />
      )}
      <span className="text-[10px] font-black text-zinc-400 shrink-0 w-4">#{seed.seed}</span>
      <span className="text-sm font-semibold truncate flex-1">{seed.team_name}</span>
      <span className="text-[10px] text-zinc-400 shrink-0 ml-1">
        {seed.overall_wins}–{seed.overall_losses}
      </span>
      {isPicked && <span className="text-[#65a30d] text-xs font-black shrink-0 ml-1">✓</span>}
    </button>
  )
}

// ── Single matchup card ───────────────────────────────────────────

function GameCard({
  round,
  gameIndex,
  teamA,
  teamB,
  teamASource,
  teamBSource,
  winnerId,
  onPick,
}: {
  round: number
  gameIndex: number
  teamA: CFPSeed | null
  teamB: CFPSeed | null
  teamASource?: string
  teamBSource?: string
  winnerId: string | null
  onPick: (teamId: string) => void
}) {
  const canPick = !!(teamA && teamB)

  const roundLabels: Record<number, string> = {
    1: 'First Round',
    2: 'Quarterfinal',
    3: 'Semifinal',
    4: 'National Championship',
  }

  return (
    <div className={`border rounded-xl bg-white overflow-hidden shadow-sm ${
      round === 4 ? 'border-[#84cc16] shadow-[#84cc16]/20 shadow-md' : 'border-zinc-200'
    }`}>
      <div className={`px-3 py-1.5 text-[10px] font-bold tracking-wide uppercase border-b ${
        round === 4
          ? 'bg-[#84cc16]/10 border-[#84cc16]/20 text-[#65a30d]'
          : 'bg-zinc-50 border-zinc-100 text-zinc-400'
      }`}>
        {roundLabels[round]}
        {round === 2 && teamA?.is_bye && (
          <span className="ml-1 text-[#84cc16] normal-case font-normal">· {teamA.team_abbr ?? teamA.team_name} has bye</span>
        )}
      </div>
      <TeamSlot
        seed={teamA}
        isPicked={!!(teamA && winnerId === teamA.team_id)}
        canPick={canPick}
        source={teamASource}
        onClick={() => teamA && onPick(teamA.team_id)}
      />
      <div className="border-t border-zinc-100 mx-3" />
      <TeamSlot
        seed={teamB}
        isPicked={!!(teamB && winnerId === teamB.team_id)}
        canPick={canPick}
        source={teamBSource}
        onClick={() => teamB && onPick(teamB.team_id)}
      />
    </div>
  )
}

// ── Rankings table ────────────────────────────────────────────────

function RankingsView({
  rankings,
  onClose,
  onCustomize,
}: {
  rankings: CFPRankedTeam[]
  onClose: () => void
  onCustomize: () => void
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-black">CFP Rankings</h2>
        <div className="flex gap-2">
          <button
            onClick={onCustomize}
            className="text-sm font-semibold px-4 py-2 rounded-lg border border-zinc-300 hover:border-zinc-400 transition-colors"
          >
            Customize
          </button>
          <button
            onClick={onClose}
            className="text-sm font-semibold px-4 py-2 rounded-lg bg-zinc-100 hover:bg-zinc-200 transition-colors"
          >
            Back to Bracket
          </button>
        </div>
      </div>

      <div className="text-xs text-zinc-500 mb-2">
        Rankings generated from your predicted season results using win %, strength of schedule, quality wins, and conference prestige.
      </div>

      <div className="border border-zinc-200 rounded-xl overflow-hidden">
        <div className="grid grid-cols-[2rem_1fr_auto_auto_auto] gap-0 text-xs font-bold text-zinc-400 uppercase tracking-wide px-4 py-2 bg-zinc-50 border-b border-zinc-100">
          <span>#</span>
          <span>Team</span>
          <span className="text-right pr-4">Overall</span>
          <span className="text-right pr-4">Conf</span>
          <span className="text-right">Status</span>
        </div>
        {rankings.slice(0, 25).map((t) => (
          <div
            key={t.team_id}
            className={`grid grid-cols-[2rem_1fr_auto_auto_auto] gap-0 items-center px-4 py-2.5 border-b border-zinc-50 last:border-0 ${
              t.rank <= 12 ? 'bg-white' : 'bg-zinc-50/50'
            }`}
          >
            <span className={`text-sm font-black ${t.rank <= 4 ? 'text-[#65a30d]' : t.rank <= 12 ? 'text-zinc-700' : 'text-zinc-400'}`}>
              {t.rank}
            </span>
            <div className="flex items-center gap-2 min-w-0">
              {t.team_logo ? (
                <img src={t.team_logo} alt={t.team_name} className="w-5 h-5 object-contain shrink-0" />
              ) : (
                <div
                  className="w-5 h-5 rounded-full shrink-0"
                  style={{ backgroundColor: t.team_color ? `#${t.team_color}` : '#e4e4e7' }}
                />
              )}
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">{t.team_name}</p>
                <p className="text-[10px] text-zinc-400">{t.conf_abbr}</p>
              </div>
            </div>
            <span className="text-sm text-zinc-600 text-right pr-4">{t.overall_wins}–{t.overall_losses}</span>
            <span className="text-sm text-zinc-400 text-right pr-4">{t.conf_wins}–{t.conf_losses}</span>
            <div className="text-right">
              {t.is_auto_bid ? (
                <span className="inline-block text-[10px] font-bold bg-[#84cc16]/20 text-[#65a30d] px-1.5 py-0.5 rounded">
                  {t.rank <= 4 ? 'BYE' : 'AUTO'}
                </span>
              ) : t.rank <= 12 ? (
                <span className="inline-block text-[10px] font-bold bg-zinc-100 text-zinc-500 px-1.5 py-0.5 rounded">
                  AT-LARGE
                </span>
              ) : (
                <span className="text-[10px] text-zinc-300">—</span>
              )}
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-zinc-400 text-center">
        Showing top 25 · Seeds 1–12 are in the playoff · Seeds 1–4 receive first-round byes
      </p>
    </div>
  )
}

// ── Customize view ────────────────────────────────────────────────

function CustomizeView({
  rankings,
  onSave,
  onCancel,
  isPending,
}: {
  rankings: CFPRankedTeam[]
  onSave: (newRankings: CFPRankedTeam[]) => void
  onCancel: () => void
  isPending: boolean
}) {
  const [ordered, setOrdered] = useState<CFPRankedTeam[]>(() => rankings.map((t, i) => ({ ...t, rank: i + 1 })))

  function move(index: number, direction: -1 | 1) {
    const next = [...ordered]
    const target = index + direction
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    setOrdered(next.map((t, i) => ({ ...t, rank: i + 1 })))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black">Customize Rankings</h2>
          <p className="text-xs text-zinc-500 mt-0.5">Reorder teams to change the bracket. Top 12 make the playoff.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={onCancel} className="text-sm px-3 py-2 rounded-lg border border-zinc-200 hover:border-zinc-300 transition-colors">
            Cancel
          </button>
          <button
            onClick={() => onSave(ordered)}
            disabled={isPending}
            className="text-sm font-bold px-4 py-2 rounded-lg bg-[#84cc16] hover:bg-[#65a30d] text-black transition-colors disabled:opacity-50"
          >
            {isPending ? 'Saving…' : 'Apply to Bracket'}
          </button>
        </div>
      </div>

      <div className="border border-zinc-200 rounded-xl overflow-hidden">
        {ordered.slice(0, 20).map((t, i) => (
          <div
            key={t.team_id}
            className={`flex items-center gap-3 px-3 py-2.5 border-b border-zinc-50 last:border-0 ${
              i < 12 ? 'bg-white' : 'bg-zinc-50'
            }`}
          >
            <span className={`text-sm font-black w-6 text-right shrink-0 ${
              i < 4 ? 'text-[#65a30d]' : i < 12 ? 'text-zinc-600' : 'text-zinc-300'
            }`}>
              {i + 1}
            </span>
            {t.team_logo ? (
              <img src={t.team_logo} alt={t.team_name} className="w-5 h-5 object-contain shrink-0" />
            ) : (
              <div className="w-5 h-5 rounded-full shrink-0 bg-zinc-200" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{t.team_name}</p>
              <p className="text-[10px] text-zinc-400">{t.conf_abbr} · {t.overall_wins}–{t.overall_losses}</p>
            </div>
            {t.is_conf_champ && (
              <span className="text-[10px] font-bold text-[#65a30d] shrink-0">CHAMP</span>
            )}
            {i === 11 && (
              <div className="text-[10px] text-zinc-400 font-medium shrink-0">← Last in</div>
            )}
            <div className="flex flex-col gap-0.5 shrink-0">
              <button
                onClick={() => move(i, -1)}
                disabled={i === 0}
                className="w-5 h-5 flex items-center justify-center rounded hover:bg-zinc-100 disabled:opacity-20 text-xs"
              >
                ▲
              </button>
              <button
                onClick={() => move(i, 1)}
                disabled={i === ordered.length - 1}
                className="w-5 h-5 flex items-center justify-center rounded hover:bg-zinc-100 disabled:opacity-20 text-xs"
              >
                ▼
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Champion banner ───────────────────────────────────────────────

function ChampionBanner({ team }: { team: CFPSeed }) {
  return (
    <div className="rounded-2xl border-2 border-[#84cc16] bg-gradient-to-br from-[#84cc16]/10 to-transparent p-6 flex flex-col items-center text-center mb-6">
      <p className="text-xs font-bold tracking-[0.2em] uppercase text-[#65a30d] mb-2">Your National Champion</p>
      {team.team_logo && (
        <img src={team.team_logo} alt={team.team_name} className="w-16 h-16 object-contain mb-3" />
      )}
      <h2 className="text-2xl font-black">{team.team_name}</h2>
      <p className="text-zinc-500 text-sm mt-1">
        #{team.seed} seed · {team.conf_name} · {team.overall_wins}–{team.overall_losses}
      </p>
    </div>
  )
}

// ── Seeding summary strip ─────────────────────────────────────────

function SeedingStrip({ seeds }: { seeds: CFPSeed[] }) {
  const sorted = [...seeds].sort((a, b) => a.seed - b.seed)
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 mb-6">
      {sorted.map(s => (
        <div
          key={s.team_id}
          className={`rounded-lg px-3 py-2 border text-center ${
            s.seed <= 4
              ? 'border-[#84cc16]/40 bg-[#84cc16]/5'
              : 'border-zinc-200 bg-white'
          }`}
        >
          <p className={`text-[10px] font-bold mb-0.5 ${s.seed <= 4 ? 'text-[#65a30d]' : 'text-zinc-400'}`}>
            #{s.seed} {s.seed <= 4 ? '· BYE' : ''}
          </p>
          <div className="flex items-center justify-center gap-1 mb-0.5">
            {s.team_logo && <img src={s.team_logo} alt={s.team_name} className="w-4 h-4 object-contain" />}
            <p className="text-xs font-bold truncate">{s.team_abbr ?? s.team_name}</p>
          </div>
          <p className="text-[10px] text-zinc-400">{s.overall_wins}–{s.overall_losses}</p>
          {s.is_auto_bid && (
            <p className="text-[9px] text-[#65a30d] font-bold">AUTO BID</p>
          )}
        </div>
      ))}
    </div>
  )
}

// ── Main bracket view ─────────────────────────────────────────────

function BracketView({
  seeds,
  picks,
  onPick,
}: {
  seeds: CFPSeed[]
  picks: Map<string, string>
  onPick: (round: number, gameIndex: number, teamId: string) => void
}) {
  const seedById = new Map(seeds.map(s => [s.team_id, s]))

  function getPick(round: number, gi: number): CFPSeed | null {
    const id = picks.get(`${round}-${gi}`)
    return id ? (seedById.get(id) ?? null) : null
  }

  const games = buildBracketGames(seeds, getPick)
  const r1 = games.filter(g => g.round === 1)
  const qf = games.filter(g => g.round === 2)
  const sf = games.filter(g => g.round === 3)
  const champ = games.filter(g => g.round === 4)
  const champion = getPick(4, 0)

  const round1Label = ['Bracket A · Upper', 'Bracket A · Lower', 'Bracket B · Upper', 'Bracket B · Lower']

  return (
    <div className="space-y-6">
      {champion && <ChampionBanner team={champion} />}

      {/* Desktop: 4-column bracket grid */}
      <div className="hidden lg:grid lg:grid-cols-4 lg:gap-4">
        {/* Round 1 */}
        <div className="space-y-2">
          <p className="text-xs font-bold text-zinc-400 uppercase tracking-wide text-center mb-3">First Round</p>
          <div className="flex flex-col gap-3 justify-around h-full">
            {r1.map((g, i) => (
              <div key={`r1-${i}`}>
                <p className="text-[10px] text-zinc-300 font-medium mb-1 text-center">{round1Label[i]}</p>
                <GameCard
                  round={g.round}
                  gameIndex={g.gameIndex}
                  teamA={g.teamA}
                  teamB={g.teamB}
                  teamASource={g.teamASource}
                  teamBSource={g.teamBSource}
                  winnerId={picks.get(`${g.round}-${g.gameIndex}`) ?? null}
                  onPick={(id) => onPick(g.round, g.gameIndex, id)}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Quarterfinals */}
        <div className="space-y-2">
          <p className="text-xs font-bold text-zinc-400 uppercase tracking-wide text-center mb-3">Quarterfinals</p>
          <div className="flex flex-col gap-3 justify-around h-full">
            {qf.map((g, i) => (
              <GameCard
                key={`qf-${i}`}
                round={g.round}
                gameIndex={g.gameIndex}
                teamA={g.teamA}
                teamB={g.teamB}
                teamASource={g.teamASource}
                teamBSource={g.teamBSource}
                winnerId={picks.get(`${g.round}-${g.gameIndex}`) ?? null}
                onPick={(id) => onPick(g.round, g.gameIndex, id)}
              />
            ))}
          </div>
        </div>

        {/* Semifinals */}
        <div className="space-y-2">
          <p className="text-xs font-bold text-zinc-400 uppercase tracking-wide text-center mb-3">Semifinals</p>
          <div className="flex flex-col gap-6 justify-around h-full">
            {sf.map((g, i) => (
              <GameCard
                key={`sf-${i}`}
                round={g.round}
                gameIndex={g.gameIndex}
                teamA={g.teamA}
                teamB={g.teamB}
                teamASource={g.teamASource}
                teamBSource={g.teamBSource}
                winnerId={picks.get(`${g.round}-${g.gameIndex}`) ?? null}
                onPick={(id) => onPick(g.round, g.gameIndex, id)}
              />
            ))}
          </div>
        </div>

        {/* Championship */}
        <div className="space-y-2">
          <p className="text-xs font-bold text-[#65a30d] uppercase tracking-wide text-center mb-3">Championship</p>
          <div className="flex items-center justify-center h-full">
            {champ.map((g) => (
              <GameCard
                key="champ"
                round={g.round}
                gameIndex={g.gameIndex}
                teamA={g.teamA}
                teamB={g.teamB}
                teamASource={g.teamASource}
                teamBSource={g.teamBSource}
                winnerId={picks.get(`${g.round}-${g.gameIndex}`) ?? null}
                onPick={(id) => onPick(g.round, g.gameIndex, id)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Mobile: stacked rounds */}
      <div className="lg:hidden space-y-8">
        {[
          { label: 'First Round', games: r1 },
          { label: 'Quarterfinals', games: qf },
          { label: 'Semifinals', games: sf },
          { label: 'National Championship', games: champ },
        ].map(({ label, games: roundGames }) => (
          <div key={label}>
            <p className={`text-sm font-black mb-3 ${label === 'National Championship' ? 'text-[#65a30d]' : 'text-zinc-700'}`}>
              {label}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {roundGames.map((g, i) => (
                <GameCard
                  key={i}
                  round={g.round}
                  gameIndex={g.gameIndex}
                  teamA={g.teamA}
                  teamB={g.teamB}
                  teamASource={g.teamASource}
                  teamBSource={g.teamBSource}
                  winnerId={picks.get(`${g.round}-${g.gameIndex}`) ?? null}
                  onPick={(id) => onPick(g.round, g.gameIndex, id)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Root client component ─────────────────────────────────────────

export default function CFPBracketClient({ bracket, initialPicks, sessionId }: Props) {
  type View = 'bracket' | 'rankings' | 'customize'
  const [view, setView] = useState<View>('bracket')
  const [isPending, startTransition] = useTransition()

  const [picks, setPicks] = useState<Map<string, string>>(() => {
    const m = new Map<string, string>()
    for (const p of initialPicks) m.set(`${p.round}-${p.game_index}`, p.winner_team_id)
    return m
  })

  // Local rankings state (can be reordered in customize view)
  const [currentRankings, setCurrentRankings] = useState<CFPRankedTeam[]>(bracket.cfp_rankings)
  const [currentSeedings, setCurrentSeedings] = useState<CFPSeed[]>(bracket.seedings)

  const seedById = new Map(currentSeedings.map(s => [s.team_id, s]))

  function handlePick(round: number, gameIndex: number, teamId: string) {
    const key = `${round}-${gameIndex}`
    const oldWinner = picks.get(key)
    if (oldWinner === teamId) return

    // Collect downstream picks to clear (cascade invalidation)
    const toClear: string[] = []
    function cascadeClear(r: number, gi: number, winnerId: string) {
      const nextKey = FEEDS_INTO[`${r}-${gi}`]
      if (!nextKey) return
      const [nextR, nextGi] = nextKey
      const nextPicked = picks.get(`${nextR}-${nextGi}`)
      if (nextPicked === winnerId) {
        toClear.push(`${nextR}-${nextGi}`)
        cascadeClear(nextR, nextGi, winnerId)
      }
    }
    if (oldWinner) cascadeClear(round, gameIndex, oldWinner)

    const newPicks = new Map(picks)
    newPicks.set(key, teamId)
    for (const k of toClear) newPicks.delete(k)
    setPicks(newPicks)

    startTransition(async () => {
      await saveCFPPickAction(bracket.id, round, gameIndex, teamId)
      if (toClear.length > 0) {
        await clearCFPPicksAction(bracket.id, toClear)
      }
    })
  }

  function handleRegenerate() {
    startTransition(async () => {
      await regenerateBracketAction(sessionId)
      // Page refreshes via revalidatePath in the action
    })
  }

  function handleSaveCustom(newRankings: CFPRankedTeam[]) {
    const reRanked = newRankings.map((t, i) => ({ ...t, rank: i + 1 }))
    const newSeedings = generateCFPField(reRanked)
    setCurrentRankings(reRanked)
    setCurrentSeedings(newSeedings)
    setPicks(new Map()) // clear picks since bracket changed
    setView('bracket')

    startTransition(async () => {
      await saveCustomBracketAction(bracket.id, newSeedings, reRanked)
      await clearCFPPicksAction(bracket.id, ['1-0','1-1','1-2','1-3','2-0','2-1','2-2','2-3','3-0','3-1','4-0'])
    })
  }

  const pickedCount = picks.size
  const totalGames = 11
  const champPick = seedById.get(picks.get('4-0') ?? '')

  return (
    <div>
      {/* Tab bar */}
      <div className="flex items-center gap-1 mb-6 border-b border-zinc-200 pb-0">
        <button
          onClick={() => setView('bracket')}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors -mb-px ${
            view === 'bracket' ? 'border-[#84cc16] text-black' : 'border-transparent text-zinc-400 hover:text-zinc-600'
          }`}
        >
          Bracket
        </button>
        <button
          onClick={() => setView('rankings')}
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors -mb-px ${
            view === 'rankings' ? 'border-[#84cc16] text-black' : 'border-transparent text-zinc-400 hover:text-zinc-600'
          }`}
        >
          CFP Rankings
        </button>
      </div>

      {/* Progress bar + actions */}
      {view === 'bracket' && (
        <div className="flex items-center gap-4 mb-6 flex-wrap">
          <div className="flex-1 min-w-[160px]">
            <div className="flex justify-between text-xs text-zinc-500 mb-1">
              <span>{pickedCount} of {totalGames} games picked</span>
              {champPick && <span className="font-semibold text-[#65a30d]">Champion: {champPick.team_name}</span>}
            </div>
            <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#84cc16] rounded-full transition-all"
                style={{ width: `${(pickedCount / totalGames) * 100}%` }}
              />
            </div>
          </div>

          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => setView('customize')}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-zinc-300 hover:border-zinc-400 transition-colors"
            >
              Customize Bracket
            </button>
            <button
              onClick={handleRegenerate}
              disabled={isPending}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-zinc-300 hover:border-zinc-400 transition-colors disabled:opacity-50"
            >
              {isPending ? 'Regenerating…' : 'Regenerate'}
            </button>
          </div>
        </div>
      )}

      {/* Seeding strip */}
      {view === 'bracket' && <SeedingStrip seeds={currentSeedings} />}

      {/* Views */}
      {view === 'bracket' && (
        <BracketView seeds={currentSeedings} picks={picks} onPick={handlePick} />
      )}
      {view === 'rankings' && (
        <RankingsView
          rankings={currentRankings}
          onClose={() => setView('bracket')}
          onCustomize={() => setView('customize')}
        />
      )}
      {view === 'customize' && (
        <CustomizeView
          rankings={currentRankings}
          onSave={handleSaveCustom}
          onCancel={() => setView(view === 'customize' ? 'bracket' : view)}
          isPending={isPending}
        />
      )}

      {isPending && (
        <div className="fixed bottom-4 right-4 bg-black text-white text-xs font-semibold px-3 py-2 rounded-full shadow-lg">
          Saving…
        </div>
      )}
    </div>
  )
}
