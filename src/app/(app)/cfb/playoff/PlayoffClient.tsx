'use client'

import { useState, useTransition } from 'react'
import type { PlayoffBracket, PlayoffPick, PlayoffTeamOption, CFPSeed } from '@/lib/data/playoff'
import { buildBracketGames, FEEDS_INTO, generateCFPField } from '@/lib/cfp/selection'
import {
  generateSimBracketAction,
  createManualBracketAction,
  savePlayoffPickAction,
  clearPlayoffPicksAction,
  updatePlayoffSeedingsAction,
  resetPlayoffBracketAction,
} from './actions'

// ── Shared bracket sub-components ─────────────────────────────────

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
      <div className={`${base} text-zinc-400 text-xs italic`}>{source ?? 'TBD'}</div>
    )
  }

  return (
    <button onClick={onClick} disabled={!canPick} className={style}>
      {seed.team_logo ? (
        <img src={seed.team_logo} alt={seed.team_name} className="w-5 h-5 object-contain shrink-0" />
      ) : (
        <div className="w-5 h-5 rounded-full shrink-0" style={{ backgroundColor: seed.team_color ? `#${seed.team_color}` : '#e4e4e7' }} />
      )}
      <span className="text-[10px] font-black text-zinc-400 shrink-0 w-4">#{seed.seed}</span>
      <span className="text-sm font-semibold truncate flex-1">{seed.team_name}</span>
      <span className="text-[10px] text-zinc-400 shrink-0 ml-1">{seed.overall_wins}–{seed.overall_losses}</span>
      {isPicked && <span className="text-[#65a30d] text-xs font-black shrink-0 ml-1">✓</span>}
    </button>
  )
}

function GameCard({
  round, gameIndex, teamA, teamB, teamASource, teamBSource, winnerId, onPick,
}: {
  round: number; gameIndex: number
  teamA: CFPSeed | null; teamB: CFPSeed | null
  teamASource?: string; teamBSource?: string
  winnerId: string | null
  onPick: (teamId: string) => void
}) {
  const canPick = !!(teamA && teamB)
  const roundLabels: Record<number, string> = {
    1: 'First Round', 2: 'Quarterfinal', 3: 'Semifinal', 4: 'National Championship',
  }

  return (
    <div className={`border rounded-xl bg-white overflow-hidden shadow-sm ${round === 4 ? 'border-[#84cc16] shadow-[#84cc16]/20 shadow-md' : 'border-zinc-200'}`}>
      <div className={`px-3 py-1.5 text-[10px] font-bold tracking-wide uppercase border-b ${round === 4 ? 'bg-[#84cc16]/10 border-[#84cc16]/20 text-[#65a30d]' : 'bg-zinc-50 border-zinc-100 text-zinc-400'}`}>
        {roundLabels[round]}
        {round === 2 && teamA?.is_bye && (
          <span className="ml-1 text-[#84cc16] normal-case font-normal">· {teamA.team_abbr ?? teamA.team_name} has bye</span>
        )}
      </div>
      <TeamSlot seed={teamA} isPicked={!!(teamA && winnerId === teamA.team_id)} canPick={canPick} source={teamASource} onClick={() => teamA && onPick(teamA.team_id)} />
      <div className="border-t border-zinc-100 mx-3" />
      <TeamSlot seed={teamB} isPicked={!!(teamB && winnerId === teamB.team_id)} canPick={canPick} source={teamBSource} onClick={() => teamB && onPick(teamB.team_id)} />
    </div>
  )
}

function ChampionBanner({ team }: { team: CFPSeed }) {
  return (
    <div className="rounded-2xl border-2 border-[#84cc16] bg-gradient-to-br from-[#84cc16]/10 to-transparent p-6 flex flex-col items-center text-center mb-6">
      <p className="text-xs font-bold tracking-[0.2em] uppercase text-[#65a30d] mb-2">Your National Champion</p>
      {team.team_logo && <img src={team.team_logo} alt={team.team_name} className="w-16 h-16 object-contain mb-3" />}
      <h2 className="text-2xl font-black">{team.team_name}</h2>
      <p className="text-zinc-500 text-sm mt-1">#{team.seed} seed · {team.conf_name} · {team.overall_wins}–{team.overall_losses}</p>
    </div>
  )
}

function SeedingStrip({ seeds }: { seeds: CFPSeed[] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 mb-6">
      {[...seeds].sort((a, b) => a.seed - b.seed).map(s => (
        <div key={s.team_id} className={`rounded-lg px-3 py-2 border text-center ${s.seed <= 4 ? 'border-[#84cc16]/40 bg-[#84cc16]/5' : 'border-zinc-200 bg-white'}`}>
          <p className={`text-[10px] font-bold mb-0.5 ${s.seed <= 4 ? 'text-[#65a30d]' : 'text-zinc-400'}`}>
            #{s.seed}{s.seed <= 4 ? ' · BYE' : ''}
          </p>
          <div className="flex items-center justify-center gap-1 mb-0.5">
            {s.team_logo && <img src={s.team_logo} alt={s.team_name} className="w-4 h-4 object-contain" />}
            <p className="text-xs font-bold truncate">{s.team_abbr ?? s.team_name}</p>
          </div>
          <p className="text-[10px] text-zinc-400">{s.overall_wins}–{s.overall_losses}</p>
        </div>
      ))}
    </div>
  )
}

function BracketView({ seeds, picks, onPick }: { seeds: CFPSeed[]; picks: Map<string, string>; onPick: (round: number, gi: number, teamId: string) => void }) {
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
  const r1Labels = ['Bracket A · Upper', 'Bracket A · Lower', 'Bracket B · Upper', 'Bracket B · Lower']

  return (
    <div className="space-y-6">
      {champion && <ChampionBanner team={champion} />}
      {/* Desktop 4-col */}
      <div className="hidden lg:grid lg:grid-cols-4 lg:gap-4">
        <div className="space-y-2">
          <p className="text-xs font-bold text-zinc-400 uppercase tracking-wide text-center mb-3">First Round</p>
          <div className="flex flex-col gap-3 justify-around h-full">
            {r1.map((g, i) => (
              <div key={`r1-${i}`}>
                <p className="text-[10px] text-zinc-300 font-medium mb-1 text-center">{r1Labels[i]}</p>
                <GameCard round={g.round} gameIndex={g.gameIndex} teamA={g.teamA} teamB={g.teamB} teamASource={g.teamASource} teamBSource={g.teamBSource} winnerId={picks.get(`${g.round}-${g.gameIndex}`) ?? null} onPick={(id) => onPick(g.round, g.gameIndex, id)} />
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-xs font-bold text-zinc-400 uppercase tracking-wide text-center mb-3">Quarterfinals</p>
          <div className="flex flex-col gap-3 justify-around h-full">
            {qf.map((g, i) => (
              <GameCard key={`qf-${i}`} round={g.round} gameIndex={g.gameIndex} teamA={g.teamA} teamB={g.teamB} teamASource={g.teamASource} teamBSource={g.teamBSource} winnerId={picks.get(`${g.round}-${g.gameIndex}`) ?? null} onPick={(id) => onPick(g.round, g.gameIndex, id)} />
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-xs font-bold text-zinc-400 uppercase tracking-wide text-center mb-3">Semifinals</p>
          <div className="flex flex-col gap-6 justify-around h-full">
            {sf.map((g, i) => (
              <GameCard key={`sf-${i}`} round={g.round} gameIndex={g.gameIndex} teamA={g.teamA} teamB={g.teamB} teamASource={g.teamASource} teamBSource={g.teamBSource} winnerId={picks.get(`${g.round}-${g.gameIndex}`) ?? null} onPick={(id) => onPick(g.round, g.gameIndex, id)} />
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-xs font-bold text-[#65a30d] uppercase tracking-wide text-center mb-3">Championship</p>
          <div className="flex items-center justify-center h-full">
            {champ.map(g => (
              <GameCard key="champ" round={g.round} gameIndex={g.gameIndex} teamA={g.teamA} teamB={g.teamB} teamASource={g.teamASource} teamBSource={g.teamBSource} winnerId={picks.get(`${g.round}-${g.gameIndex}`) ?? null} onPick={(id) => onPick(g.round, g.gameIndex, id)} />
            ))}
          </div>
        </div>
      </div>
      {/* Mobile stacked */}
      <div className="lg:hidden space-y-8">
        {[
          { label: 'First Round', games: r1 },
          { label: 'Quarterfinals', games: qf },
          { label: 'Semifinals', games: sf },
          { label: 'National Championship', games: champ },
        ].map(({ label, games: rg }) => (
          <div key={label}>
            <p className={`text-sm font-black mb-3 ${label === 'National Championship' ? 'text-[#65a30d]' : 'text-zinc-700'}`}>{label}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {rg.map((g, i) => (
                <GameCard key={i} round={g.round} gameIndex={g.gameIndex} teamA={g.teamA} teamB={g.teamB} teamASource={g.teamASource} teamBSource={g.teamBSource} winnerId={picks.get(`${g.round}-${g.gameIndex}`) ?? null} onPick={(id) => onPick(g.round, g.gameIndex, id)} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Setup screen ──────────────────────────────────────────────────

function ManualPicker({
  teamOptions,
  onConfirm,
  onCancel,
  isPending,
}: {
  teamOptions: PlayoffTeamOption[]
  onConfirm: (teamIds: string[]) => void
  onCancel: () => void
  isPending: boolean
}) {
  const [selected, setSelected] = useState<string[]>([])

  // Group by conference
  const byConf = new Map<string, PlayoffTeamOption[]>()
  for (const t of teamOptions) {
    const list = byConf.get(t.conf_name) ?? []
    list.push(t)
    byConf.set(t.conf_name, list)
  }
  const confs = [...byConf.keys()].sort()

  function toggle(id: string) {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : prev.length < 12 ? [...prev, id] : prev
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-black">Pick Your 12 Teams</h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Select exactly 12 teams. The order you pick them becomes seeds 1–12.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={onCancel}
            className="text-sm px-3 py-2 rounded-lg border border-zinc-200 hover:border-zinc-300 transition-colors"
          >
            Back
          </button>
          <button
            onClick={() => onConfirm(selected)}
            disabled={selected.length !== 12 || isPending}
            className="text-sm font-bold px-4 py-2 rounded-lg bg-[#84cc16] hover:bg-[#65a30d] text-black transition-colors disabled:opacity-40"
          >
            {isPending ? 'Building…' : `Build Bracket (${selected.length}/12)`}
          </button>
        </div>
      </div>

      {/* Selected seeds strip */}
      {selected.length > 0 && (
        <div className="mb-4 p-3 rounded-xl bg-zinc-50 border border-zinc-200">
          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Your Seeds</p>
          <div className="flex flex-wrap gap-2">
            {selected.map((id, i) => {
              const t = teamOptions.find(x => x.id === id)
              return (
                <button
                  key={id}
                  onClick={() => toggle(id)}
                  className="flex items-center gap-1.5 pl-2 pr-3 py-1 rounded-full bg-[#84cc16]/20 hover:bg-red-100 hover:text-red-600 transition-colors text-sm font-semibold"
                >
                  <span className="text-[10px] font-black text-zinc-500">#{i + 1}</span>
                  {t?.logo_url && <img src={t.logo_url} alt="" className="w-4 h-4 object-contain" />}
                  {t?.abbreviation ?? t?.name}
                  <span className="text-zinc-400 text-xs">×</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div className="space-y-6">
        {confs.map(conf => (
          <div key={conf}>
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">{conf}</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {(byConf.get(conf) ?? []).map(t => {
                const idx = selected.indexOf(t.id)
                const isSelected = idx !== -1
                const isFull = selected.length >= 12 && !isSelected
                return (
                  <button
                    key={t.id}
                    onClick={() => toggle(t.id)}
                    disabled={isFull}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm transition-all text-left ${
                      isSelected
                        ? 'border-[#84cc16] bg-[#84cc16]/10 font-bold'
                        : isFull
                          ? 'border-zinc-100 bg-zinc-50 text-zinc-300 cursor-not-allowed'
                          : 'border-zinc-200 hover:border-[#84cc16] hover:bg-zinc-50'
                    }`}
                  >
                    {t.logo_url ? (
                      <img src={t.logo_url} alt={t.name} className="w-5 h-5 object-contain shrink-0" />
                    ) : (
                      <div className="w-5 h-5 rounded-full shrink-0" style={{ backgroundColor: t.color ? `#${t.color}` : '#e4e4e7' }} />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm leading-tight">{t.name}</p>
                      <p className="text-[10px] text-zinc-400">{t.sim_wins}–{t.sim_losses}</p>
                    </div>
                    {isSelected && (
                      <span className="text-[10px] font-black text-[#65a30d] shrink-0">#{idx + 1}</span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Root client component ─────────────────────────────────────────

interface Props {
  initialBracket: PlayoffBracket | null
  initialPicks: PlayoffPick[]
  teamOptions: PlayoffTeamOption[]
}

export default function PlayoffClient({ initialBracket, initialPicks, teamOptions }: Props) {
  type SetupView = 'choose' | 'manual-picker'
  type MainView = 'bracket' | 'customize'

  const [bracket, setBracket] = useState<PlayoffBracket | null>(initialBracket)
  const [setupView, setSetupView] = useState<SetupView>('choose')
  const [mainView, setMainView] = useState<MainView>('bracket')
  const [isPending, startTransition] = useTransition()
  const [isResetting, setIsResetting] = useState(false)

  const [picks, setPicks] = useState<Map<string, string>>(() => {
    const m = new Map<string, string>()
    for (const p of initialPicks) m.set(`${p.round}-${p.game_index}`, p.winner_team_id)
    return m
  })

  const [currentSeedings, setCurrentSeedings] = useState<CFPSeed[]>(initialBracket?.seedings ?? [])

  // ── Setup handlers ─────────────────────────────────────────────

  function handleSimGenerate() {
    startTransition(async () => {
      const result = await generateSimBracketAction()
      setBracket({ id: result.id, user_id: '', season: 0, seedings: result.seedings, setup_mode: 'sim', sim_seed: '' })
      setCurrentSeedings(result.seedings)
      setPicks(new Map())
    })
  }

  function handleManualConfirm(teamIds: string[]) {
    startTransition(async () => {
      const result = await createManualBracketAction(teamIds)
      setBracket({ id: result.id, user_id: '', season: 0, seedings: result.seedings, setup_mode: 'manual', sim_seed: '' })
      setCurrentSeedings(result.seedings)
      setPicks(new Map())
    })
  }

  // ── Bracket handlers ───────────────────────────────────────────

  function handlePick(round: number, gameIndex: number, teamId: string) {
    if (!bracket) return
    const key = `${round}-${gameIndex}`
    const oldWinner = picks.get(key)
    if (oldWinner === teamId) return

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
      await savePlayoffPickAction(bracket.id, round, gameIndex, teamId)
      if (toClear.length > 0) await clearPlayoffPicksAction(bracket.id, toClear)
    })
  }

  function handleCustomizeSave(newSeedings: CFPSeed[]) {
    if (!bracket) return
    setCurrentSeedings(newSeedings)
    setPicks(new Map())
    setMainView('bracket')

    startTransition(async () => {
      await updatePlayoffSeedingsAction(bracket.id, newSeedings)
      await clearPlayoffPicksAction(bracket.id, ['1-0','1-1','1-2','1-3','2-0','2-1','2-2','2-3','3-0','3-1','4-0'])
    })
  }

  async function handleReset() {
    setIsResetting(true)
    try {
      await resetPlayoffBracketAction()
      setBracket(null)
      setCurrentSeedings([])
      setPicks(new Map())
      setSetupView('choose')
    } finally {
      setIsResetting(false)
    }
  }

  // ── Setup screen ───────────────────────────────────────────────

  if (!bracket) {
    if (setupView === 'manual-picker') {
      return (
        <ManualPicker
          teamOptions={teamOptions}
          onConfirm={handleManualConfirm}
          onCancel={() => setSetupView('choose')}
          isPending={isPending}
        />
      )
    }

    return (
      <div className="max-w-2xl">
        {isPending ? (
          <div className="p-12 rounded-2xl border border-zinc-200 text-center">
            <div className="w-10 h-10 border-2 border-[#84cc16] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="font-semibold text-zinc-600">Simulating the season…</p>
            <p className="text-sm text-zinc-400 mt-1">Computing results for all FBS teams</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-5">
            {/* Sim option */}
            <button
              onClick={handleSimGenerate}
              className="flex flex-col gap-4 p-6 rounded-2xl border-2 border-zinc-200 hover:border-[#84cc16] hover:shadow-md transition-all text-left group"
            >
              <div className="w-12 h-12 rounded-xl bg-black flex items-center justify-center text-[#84cc16] text-xl font-black">
                ⚡
              </div>
              <div>
                <h3 className="text-xl font-black">Run Simulation</h3>
                <p className="text-sm text-zinc-500 mt-1.5 leading-relaxed">
                  Instantly simulate the entire FBS season using team ratings and actual results.
                  The engine auto-generates your 12-team field — ready to pick in seconds.
                </p>
              </div>
              <span className="text-sm font-bold text-zinc-400 group-hover:text-[#84cc16] transition-colors mt-auto">
                Generate bracket →
              </span>
            </button>

            {/* Manual option */}
            <button
              onClick={() => setSetupView('manual-picker')}
              className="flex flex-col gap-4 p-6 rounded-2xl border-2 border-zinc-200 hover:border-[#84cc16] hover:shadow-md transition-all text-left group"
            >
              <div className="w-12 h-12 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-600 text-xl font-black">
                ✋
              </div>
              <div>
                <h3 className="text-xl font-black">Pick Manually</h3>
                <p className="text-sm text-zinc-500 mt-1.5 leading-relaxed">
                  Hand-pick the 12 teams you think will make the CFP. The order you select
                  them becomes seeds 1–12, which you can reorder before picking.
                </p>
              </div>
              <span className="text-sm font-bold text-zinc-400 group-hover:text-[#84cc16] transition-colors mt-auto">
                Choose teams →
              </span>
            </button>
          </div>
        )}
      </div>
    )
  }

  // ── Bracket screen ─────────────────────────────────────────────

  const pickedCount = picks.size
  const totalGames = 11
  const seedById = new Map(currentSeedings.map(s => [s.team_id, s]))
  const champPick = seedById.get(picks.get('4-0') ?? '')

  if (mainView === 'customize') {
    return (
      <CustomizeView
        seedings={currentSeedings}
        onSave={handleCustomizeSave}
        onCancel={() => setMainView('bracket')}
        isPending={isPending}
      />
    )
  }

  return (
    <div>
      {/* Controls */}
      <div className="flex items-center gap-4 mb-6 flex-wrap">
        <div className="flex-1 min-w-[160px]">
          <div className="flex justify-between text-xs text-zinc-500 mb-1">
            <span>{pickedCount} of {totalGames} games picked</span>
            {champPick && <span className="font-semibold text-[#65a30d]">Champion: {champPick.team_name}</span>}
          </div>
          <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
            <div className="h-full bg-[#84cc16] rounded-full transition-all" style={{ width: `${(pickedCount / totalGames) * 100}%` }} />
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => setMainView('customize')}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-zinc-300 hover:border-zinc-400 transition-colors"
          >
            Reorder Seeds
          </button>
          <button
            onClick={handleReset}
            disabled={isResetting || isPending}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-zinc-300 hover:border-red-300 hover:text-red-600 transition-colors disabled:opacity-50"
          >
            {isResetting ? 'Resetting…' : 'Start Over'}
          </button>
        </div>
      </div>

      <SeedingStrip seeds={currentSeedings} />
      <BracketView seeds={currentSeedings} picks={picks} onPick={handlePick} />

      {isPending && (
        <div className="fixed bottom-4 right-4 bg-black text-white text-xs font-semibold px-3 py-2 rounded-full shadow-lg">
          Saving…
        </div>
      )}
    </div>
  )
}

// ── Customize / reorder seeds ──────────────────────────────────────

function CustomizeView({
  seedings,
  onSave,
  onCancel,
  isPending,
}: {
  seedings: CFPSeed[]
  onSave: (newSeedings: CFPSeed[]) => void
  onCancel: () => void
  isPending: boolean
}) {
  const [ordered, setOrdered] = useState<CFPSeed[]>(() =>
    [...seedings].sort((a, b) => a.seed - b.seed)
  )

  function move(index: number, direction: -1 | 1) {
    const next = [...ordered]
    const target = index + direction
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    setOrdered(next.map((s, i) => ({ ...s, seed: i + 1, is_bye: i < 4 })))
  }

  function handleSave() {
    onSave(ordered.map((s, i) => ({ ...s, seed: i + 1, is_bye: i < 4 })))
  }

  return (
    <div className="max-w-lg">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-black">Reorder Seeds</h2>
          <p className="text-xs text-zinc-500 mt-0.5">Seeds 1–4 receive first-round byes. Reordering clears your picks.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={onCancel} className="text-sm px-3 py-2 rounded-lg border border-zinc-200 hover:border-zinc-300 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isPending}
            className="text-sm font-bold px-4 py-2 rounded-lg bg-[#84cc16] hover:bg-[#65a30d] text-black transition-colors disabled:opacity-50"
          >
            {isPending ? 'Saving…' : 'Apply'}
          </button>
        </div>
      </div>

      <div className="border border-zinc-200 rounded-xl overflow-hidden">
        {ordered.map((s, i) => (
          <div key={s.team_id} className={`flex items-center gap-3 px-3 py-2.5 border-b border-zinc-50 last:border-0 ${i < 4 ? 'bg-[#84cc16]/5' : 'bg-white'}`}>
            <span className={`text-sm font-black w-6 text-right shrink-0 ${i < 4 ? 'text-[#65a30d]' : 'text-zinc-500'}`}>
              {i + 1}
            </span>
            {s.team_logo ? (
              <img src={s.team_logo} alt={s.team_name} className="w-5 h-5 object-contain shrink-0" />
            ) : (
              <div className="w-5 h-5 rounded-full shrink-0 bg-zinc-200" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{s.team_name}</p>
              <p className="text-[10px] text-zinc-400">{s.conf_abbr} · {s.overall_wins}–{s.overall_losses}</p>
            </div>
            {i === 3 && <span className="text-[10px] text-[#65a30d] font-bold shrink-0">← Last BYE</span>}
            <div className="flex flex-col gap-0.5 shrink-0">
              <button onClick={() => move(i, -1)} disabled={i === 0} className="w-5 h-5 flex items-center justify-center rounded hover:bg-zinc-100 disabled:opacity-20 text-xs">▲</button>
              <button onClick={() => move(i, 1)} disabled={i === ordered.length - 1} className="w-5 h-5 flex items-center justify-center rounded hover:bg-zinc-100 disabled:opacity-20 text-xs">▼</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
