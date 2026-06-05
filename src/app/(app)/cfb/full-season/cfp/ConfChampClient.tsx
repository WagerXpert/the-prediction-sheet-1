'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { CFPBracket, CFPConfChampGame } from '@/lib/data/cfp'
import { saveConfChampPickAction, generateBracketSeedingsAction } from './actions'

interface Props {
  bracket: CFPBracket
  confChampGames: CFPConfChampGame[]
}

function TeamCard({
  teamId,
  name,
  abbr,
  logo,
  color,
  wins,
  losses,
  confWins,
  confLosses,
  isPicked,
  onClick,
}: {
  teamId: string | null
  name: string
  abbr: string | null
  logo: string | null
  color: string | null
  wins: number
  losses: number
  confWins: number
  confLosses: number
  isPicked: boolean
  onClick: () => void
}) {
  if (!teamId) {
    return (
      <div className="flex-1 rounded-xl border border-zinc-200 bg-zinc-50 flex items-center justify-center py-6">
        <p className="text-sm text-zinc-400 italic">TBD</p>
      </div>
    )
  }

  return (
    <button
      onClick={onClick}
      className={`flex-1 rounded-xl border-2 transition-all text-left p-4 ${
        isPicked
          ? 'border-[#84cc16] bg-[#84cc16]/10 shadow-md'
          : 'border-zinc-200 bg-white hover:border-zinc-400 hover:shadow-sm'
      }`}
    >
      <div className="flex items-center gap-3 mb-2">
        {logo ? (
          <img src={logo} alt={name} className="w-10 h-10 object-contain shrink-0" />
        ) : (
          <div
            className="w-10 h-10 rounded-full shrink-0"
            style={{ backgroundColor: color ? `#${color}` : '#e4e4e7' }}
          />
        )}
        <div>
          <p className="font-black text-base leading-tight">{name}</p>
          <p className="text-xs text-zinc-400">{abbr}</p>
        </div>
        {isPicked && (
          <span className="ml-auto text-[#84cc16] text-xl font-black shrink-0">✓</span>
        )}
      </div>
      <div className="flex gap-3 text-xs text-zinc-500">
        <span>
          <span className="font-bold text-zinc-700">{wins}–{losses}</span> overall
        </span>
        <span>
          <span className="font-bold text-zinc-700">{confWins}–{confLosses}</span> conf
        </span>
      </div>
    </button>
  )
}

export default function ConfChampClient({ bracket, confChampGames }: Props) {
  const router = useRouter()
  const [picks, setPicks] = useState<Map<string, string>>(() => {
    const m = new Map<string, string>()
    for (const g of confChampGames) {
      if (g.winner_team_id) m.set(g.id, g.winner_team_id)
    }
    return m
  })
  const [isPending, startTransition] = useTransition()
  const [isGenerating, setIsGenerating] = useState(false)

  const allPicked = confChampGames.every(g => picks.has(g.id))
  const pickedCount = picks.size
  const totalGames = confChampGames.length

  function handlePick(gameId: string, teamId: string) {
    if (picks.get(gameId) === teamId) return
    setPicks(prev => new Map(prev).set(gameId, teamId))
    startTransition(async () => {
      await saveConfChampPickAction(gameId, teamId)
    })
  }

  async function handleGenerateBracket() {
    setIsGenerating(true)
    try {
      await generateBracketSeedingsAction(bracket.session_id)
      router.refresh()
    } finally {
      setIsGenerating(false)
    }
  }

  // Sort: Power 4 first (by prestige), then G5
  const P4_RE = /SEC|Southeastern|Big Ten|ACC|Atlantic Coast|Big 12|Pac.?12/i
  const sorted = [...confChampGames].sort((a, b) => {
    const aP4 = P4_RE.test(a.conference_name)
    const bP4 = P4_RE.test(b.conference_name)
    if (aP4 && !bP4) return -1
    if (!aP4 && bP4) return 1
    return a.conference_name.localeCompare(b.conference_name)
  })

  return (
    <div>
      {/* Step indicator */}
      <div className="flex items-center gap-3 mb-8">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-[#84cc16] flex items-center justify-center">
            <span className="text-xs font-black text-black">✓</span>
          </div>
          <span className="text-sm font-semibold text-zinc-500">Regular Season</span>
        </div>
        <div className="h-px flex-1 bg-[#84cc16]" />
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-black flex items-center justify-center">
            <span className="text-xs font-black text-white">2</span>
          </div>
          <span className="text-sm font-black">Conference Championships</span>
        </div>
        <div className="h-px flex-1 bg-zinc-200" />
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full border-2 border-zinc-300 flex items-center justify-center">
            <span className="text-xs font-black text-zinc-400">3</span>
          </div>
          <span className="text-sm font-semibold text-zinc-400">CFP Bracket</span>
        </div>
      </div>

      {/* Progress + generate button */}
      <div className="flex items-center gap-4 mb-8 p-4 rounded-xl bg-zinc-50 border border-zinc-200">
        <div className="flex-1 min-w-0">
          <div className="flex justify-between text-xs text-zinc-500 mb-1.5">
            <span className="font-semibold">{pickedCount} of {totalGames} championship games picked</span>
            {allPicked && <span className="text-[#65a30d] font-bold">All picked — ready to generate!</span>}
          </div>
          <div className="h-2 bg-zinc-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#84cc16] rounded-full transition-all duration-500"
              style={{ width: `${totalGames > 0 ? (pickedCount / totalGames) * 100 : 0}%` }}
            />
          </div>
        </div>
        <button
          onClick={handleGenerateBracket}
          disabled={!allPicked || isGenerating || isPending}
          className={`shrink-0 font-bold px-5 py-2.5 rounded-xl transition-all text-sm ${
            allPicked
              ? 'bg-[#84cc16] text-black hover:bg-[#65a30d] shadow-sm'
              : 'bg-zinc-200 text-zinc-400 cursor-not-allowed'
          } disabled:opacity-60`}
        >
          {isGenerating ? 'Generating…' : 'Generate CFP Rankings & Bracket →'}
        </button>
      </div>

      {/* Championship game cards */}
      <div className="space-y-4">
        {sorted.map(game => {
          const pickedId = picks.get(game.id) ?? null
          const isP4 = P4_RE.test(game.conference_name)

          return (
            <div key={game.id} className="border border-zinc-200 rounded-2xl overflow-hidden bg-white">
              {/* Conference header */}
              <div className={`px-5 py-3 flex items-center gap-3 border-b border-zinc-100 ${isP4 ? 'bg-zinc-50' : 'bg-white'}`}>
                {game.conference_logo ? (
                  <img src={game.conference_logo} alt={game.conference_abbr} className="w-6 h-6 object-contain" />
                ) : (
                  <div className="w-6 h-6 rounded bg-zinc-200" />
                )}
                <div>
                  <p className="font-black text-sm">{game.conference_name} Championship</p>
                  {isP4 && (
                    <p className="text-[10px] font-bold text-[#65a30d] uppercase tracking-wide">Power 4 · Auto Bid Eligible</p>
                  )}
                </div>
                {pickedId && (
                  <div className="ml-auto flex items-center gap-1.5">
                    {(pickedId === game.team_a_id ? game.team_a_logo : game.team_b_logo) && (
                      <img
                        src={(pickedId === game.team_a_id ? game.team_a_logo : game.team_b_logo)!}
                        alt=""
                        className="w-5 h-5 object-contain"
                      />
                    )}
                    <p className="text-xs font-bold text-[#65a30d]">
                      {pickedId === game.team_a_id ? (game.team_a_abbr ?? game.team_a_name) : (game.team_b_abbr ?? game.team_b_name)} wins
                    </p>
                  </div>
                )}
              </div>

              {/* Teams */}
              <div className="p-4 flex gap-3 items-center">
                <TeamCard
                  teamId={game.team_a_id}
                  name={game.team_a_name}
                  abbr={game.team_a_abbr}
                  logo={game.team_a_logo}
                  color={game.team_a_color}
                  wins={game.team_a_wins}
                  losses={game.team_a_losses}
                  confWins={game.team_a_conf_wins}
                  confLosses={game.team_a_conf_losses}
                  isPicked={pickedId === game.team_a_id}
                  onClick={() => game.team_a_id && handlePick(game.id, game.team_a_id)}
                />

                <div className="text-center shrink-0">
                  <p className="text-xs font-black text-zinc-300 tracking-widest">VS</p>
                </div>

                <TeamCard
                  teamId={game.team_b_id}
                  name={game.team_b_name}
                  abbr={game.team_b_abbr}
                  logo={game.team_b_logo}
                  color={game.team_b_color}
                  wins={game.team_b_wins}
                  losses={game.team_b_losses}
                  confWins={game.team_b_conf_wins}
                  confLosses={game.team_b_conf_losses}
                  isPicked={pickedId === game.team_b_id}
                  onClick={() => game.team_b_id && handlePick(game.id, game.team_b_id)}
                />
              </div>
            </div>
          )
        })}
      </div>

      {confChampGames.length === 0 && (
        <div className="text-center py-16 text-zinc-400">
          <p className="text-lg font-semibold mb-1">No Conference Data Yet</p>
          <p className="text-sm">Predict more team schedules in Full Season Mode to generate conference championships.</p>
        </div>
      )}
    </div>
  )
}
