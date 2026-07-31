import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  BadgeCheck,
  Check,
  Copy,
  Crown,
  History,
  Medal,
  ShieldCheck,
  Swords,
  Trophy,
} from 'lucide-react'
import PageWrapper from '../components/layout/PageWrapper'
import StatCard from '../components/cards/StatCard'
import PointsLineChart from '../components/charts/PointsLineChart'
import LoadingSpinner from '../components/cards/LoadingSpinner'
import ErrorMessage from '../components/cards/ErrorMessage'
import { useApi } from '../hooks/useApi'
import { managersApi, statsApi } from '../api/client'
import type {
  ManagerBadge,
  ManagerOpponentIdentity,
  ManagerProfile as MgrProfile,
  ManagerStats,
} from '../types'

const badgeIcons = {
  crown: Crown,
  trophy: Trophy,
  medal: Medal,
  'badge-check': BadgeCheck,
  shield: ShieldCheck,
  history: History,
}

function BadgeCard({ badge }: { badge: ManagerBadge }) {
  const Icon = badgeIcons[badge.icon as keyof typeof badgeIcons] ?? BadgeCheck
  return (
    <div className="rounded-lg border border-amber-800/50 bg-amber-950/20 p-3">
      <div className="flex items-center gap-2 text-amber-300">
        <Icon className="h-4 w-4" aria-hidden="true" />
        <span className="text-xs font-bold uppercase tracking-wider">{badge.label}</span>
      </div>
      <p className="mt-1.5 text-xs leading-relaxed text-gray-400">{badge.description}</p>
    </div>
  )
}

function IdentityCard({
  label,
  identity,
  managerId,
  tone,
}: {
  label: string
  identity: ManagerOpponentIdentity | null
  managerId: number
  tone: 'green' | 'red' | 'blue'
}) {
  const tones = {
    green: 'text-emerald-400 border-emerald-900/60 bg-emerald-950/20',
    red: 'text-red-400 border-red-900/60 bg-red-950/20',
    blue: 'text-blue-400 border-blue-900/60 bg-blue-950/20',
  }

  return (
    <div className={`rounded-xl border p-4 ${tones[tone]}`}>
      <div className="mb-3 flex items-center gap-2">
        <Swords className="h-4 w-4" aria-hidden="true" />
        <span className="text-xs font-semibold uppercase tracking-wider">{label}</span>
      </div>
      {identity ? (
        <>
          <Link
            to={`/rivalries/matchup?a=${managerId}&b=${identity.manager_id}`}
            className="text-lg font-bold text-white hover:text-brand-300"
          >
            {identity.manager_name}
          </Link>
          <div className="mt-1 text-sm text-gray-300">
            {identity.wins}–{identity.losses}
            {identity.ties ? `–${identity.ties}` : ''}{' '}
            <span className="text-gray-500">across {identity.games} games</span>
          </div>
          <div className="mt-2 text-xs text-gray-500">
            {(identity.win_pct * 100).toFixed(1)}% win rate · {identity.point_diff >= 0 ? '+' : ''}
            {identity.point_diff.toFixed(1)} point differential
          </div>
        </>
      ) : (
        <p className="text-sm text-gray-500">Not enough matchup history.</p>
      )}
    </div>
  )
}

export default function ManagerProfile() {
  const { id } = useParams<{ id: string }>()
  const managerId = Number(id)
  const [copied, setCopied] = useState(false)

  const { data: profile, loading, error } = useApi<MgrProfile>(
    ['manager-profile', managerId],
    () => managersApi.get(managerId),
  )
  const { data: allTime } = useApi<ManagerStats[]>(['managers'], () => managersApi.list())
  const { data: streak } = useApi(
    ['manager-streak', managerId],
    () => managersApi.streak(managerId),
  )
  const { data: trophy } = useApi(
    ['trophy-case', managerId],
    () => statsApi.trophyCase(managerId),
  )

  const myStats = allTime?.find(manager => manager.id === managerId)
  const lineData = profile?.season_history.map(season => ({
    year: season.year,
    points_for: season.points_for,
    wins: season.wins,
  })) ?? []

  async function copyProfileLink() {
    await navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  if (loading) return <PageWrapper title="Manager Profile"><LoadingSpinner /></PageWrapper>
  if (error) return <PageWrapper title="Manager Profile"><ErrorMessage message={error} /></PageWrapper>
  if (!profile) return null

  const { manager, summary, season_history } = profile
  const placement = summary?.placement

  return (
    <PageWrapper title={manager.display_name} subtitle={manager.nickname ? `"${manager.nickname}"` : 'Career résumé and league identity.'}>
      <section className="relative mb-6 overflow-hidden rounded-2xl border border-brand-800/60 bg-gradient-to-br from-brand-950 via-gray-900 to-gray-950 p-5 md:p-7">
        <div className="absolute -right-12 -top-16 h-48 w-48 rounded-full bg-brand-500/10 blur-3xl" aria-hidden="true" />
        <div className="relative flex flex-col justify-between gap-5 md:flex-row md:items-start">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              {placement && (
                <span className="rounded-full border border-brand-700 bg-brand-950/80 px-3 py-1 text-xs font-bold text-brand-300">
                  #{placement.placement_rank} average finish
                </span>
              )}
              {placement && placement.championships > 0 && (
                <span className="rounded-full border border-amber-700/70 bg-amber-950/70 px-3 py-1 text-xs font-bold text-amber-300">
                  {placement.championships}× champion
                </span>
              )}
            </div>
            {placement && (
              <div className="mt-5 flex flex-wrap gap-x-8 gap-y-4">
                <div>
                  <div className="text-3xl font-black text-white">{placement.average_finish.toFixed(2)}</div>
                  <div className="text-xs uppercase tracking-wider text-gray-500">Average finish</div>
                </div>
                <div>
                  <div className="text-3xl font-black text-blue-300">
                    {placement.finish_percentile?.toFixed(1) ?? '—'}%
                  </div>
                  <div className="text-xs uppercase tracking-wider text-gray-500">Era adjusted</div>
                </div>
                <div>
                  <div className="text-3xl font-black text-purple-300">{placement.top_three_finishes}</div>
                  <div className="text-xs uppercase tracking-wider text-gray-500">Podium finishes</div>
                </div>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={copyProfileLink}
            className="flex shrink-0 items-center justify-center gap-2 rounded-lg border border-gray-700 bg-gray-900/80 px-3 py-2 text-xs font-semibold text-gray-300 hover:border-gray-600 hover:text-white"
          >
            {copied ? <Check className="h-4 w-4 text-green-400" aria-hidden="true" /> : <Copy className="h-4 w-4" aria-hidden="true" />}
            {copied ? 'Link copied' : 'Copy profile link'}
          </button>
        </div>
      </section>

      {myStats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <StatCard label="Career Record" value={`${myStats.total_wins}–${myStats.total_losses}`} sub={`${(myStats.win_pct * 100).toFixed(1)}% win rate`} />
          <StatCard label="Playoff Rate" value={`${(myStats.playoff_rate * 100).toFixed(0)}%`} sub={`${myStats.playoff_appearances} of ${myStats.seasons_played} seasons`} />
          <StatCard label="Best / Worst" value={`${myStats.best_finish ?? '—'} / ${myStats.worst_finish ?? '—'}`} sub="Official final standing" />
          <StatCard label="Title Drought" value={`${myStats.current_drought} yrs`} sub={trophy?.championships?.length ? `Last: ${trophy.championships[trophy.championships.length - 1]}` : 'Still chasing the first'} />
        </div>
      )}

      {summary && (
        <>
          {summary.badges.length > 0 && (
            <section className="mb-6" aria-labelledby="manager-badges-heading">
              <h2 id="manager-badges-heading" className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-300">
                Earned Badges
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {summary.badges.map(badge => <BadgeCard key={badge.key} badge={badge} />)}
              </div>
            </section>
          )}

          <section className="mb-6" aria-labelledby="league-identity-heading">
            <h2 id="league-identity-heading" className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-300">
              League Identity
            </h2>
            <div className="grid gap-3 md:grid-cols-3">
              <IdentityCard label="Favorite Opponent" identity={summary.favorite_opponent} managerId={managerId} tone="green" />
              <IdentityCard label="Nemesis" identity={summary.nemesis} managerId={managerId} tone="red" />
              <IdentityCard label="Closest Rivalry" identity={summary.closest_rivalry} managerId={managerId} tone="blue" />
            </div>
          </section>

          {summary.signature_season && (
            <section className="mb-6 overflow-hidden rounded-xl border border-amber-800/50 bg-gradient-to-r from-amber-950/35 to-gray-900">
              <div className="grid gap-5 p-5 md:grid-cols-[1fr_auto] md:items-center">
                <div>
                  <div className="mb-2 flex items-center gap-2 text-amber-300">
                    <Trophy className="h-4 w-4" aria-hidden="true" />
                    <h2 className="text-xs font-semibold uppercase tracking-wider">Signature Season</h2>
                  </div>
                  <Link to={`/seasons/archive?year=${summary.signature_season.year}`} className="text-2xl font-black text-white hover:text-amber-200">
                    {summary.signature_season.year}
                  </Link>
                  <p className="mt-1 text-sm text-gray-400">
                    {summary.signature_season.team_name ?? 'Unnamed team'} · {summary.signature_season.wins}–
                    {summary.signature_season.losses}
                    {summary.signature_season.ties ? `–${summary.signature_season.ties}` : ''}
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-5 text-center">
                  <div>
                    <div className="text-xl font-bold text-amber-300">#{summary.signature_season.final_finish}</div>
                    <div className="text-[10px] uppercase tracking-wider text-gray-500">Final</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-white">{summary.signature_season.points_for.toFixed(0)}</div>
                    <div className="text-[10px] uppercase tracking-wider text-gray-500">Points</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-blue-300">{summary.signature_season.finish_percentile?.toFixed(0) ?? '—'}%</div>
                    <div className="text-[10px] uppercase tracking-wider text-gray-500">Percentile</div>
                  </div>
                </div>
              </div>
            </section>
          )}
        </>
      )}

      {(streak || trophy?.championships.length) && (
        <div className="flex flex-wrap gap-2 mb-6">
          {streak && (
            <>
              <div className="rounded-full border border-gray-800 bg-gray-900 px-4 py-1.5 text-sm text-gray-300">
                Current: <span className={`font-bold ${streak.current_streak_type === 'W' ? 'text-green-400' : 'text-red-400'}`}>{streak.current_streak_length}{streak.current_streak_type}</span>
              </div>
              <div className="rounded-full border border-gray-800 bg-gray-900 px-4 py-1.5 text-sm text-gray-300">
                Best streak: <span className="font-bold text-green-400">{streak.best_win_streak}W</span>
              </div>
            </>
          )}
          {trophy?.championships.map((year: number) => (
            <span key={year} className="rounded-full border border-amber-700 bg-amber-900 px-3 py-1 text-xs font-bold text-amber-300">🏆 {year}</span>
          ))}
          {trophy?.runner_ups.map((year: number) => (
            <span key={year} className="rounded-full border border-gray-600 bg-gray-800 px-3 py-1 text-xs text-gray-300">🥈 {year}</span>
          ))}
        </div>
      )}

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
        <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">Points Scored Per Season</h2>
        <PointsLineChart
          data={lineData}
          lines={[{ key: 'points_for', label: 'Points For' }]}
          yLabel="Points"
        />
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-800">
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">Season History</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-900 text-gray-400 text-xs uppercase tracking-wider">
                <th className="px-4 py-3 text-left">Year</th>
                <th className="px-4 py-3 text-left">Team</th>
                <th className="px-4 py-3 text-right">Record</th>
                <th className="px-4 py-3 text-right">PF</th>
                <th className="px-4 py-3 text-right">PA</th>
                <th className="px-4 py-3 text-right">Final</th>
                <th className="px-4 py-3 text-right">Percentile</th>
                <th className="px-4 py-3 text-center">Result</th>
              </tr>
            </thead>
            <tbody>
              {[...season_history].reverse().map(season => (
                <tr key={season.year} className={`border-t border-gray-800 hover:bg-gray-800 transition-colors ${season.is_champion ? 'bg-amber-950/20' : ''}`}>
                  <td className="px-4 py-3 font-medium">
                    <Link to={`/seasons/archive?year=${season.year}`} className="text-brand-400 hover:underline">{season.year}</Link>
                  </td>
                  <td className="px-4 py-3 text-gray-400">{season.team_name ?? '—'}</td>
                  <td className="px-4 py-3 text-right text-gray-300">{season.wins}–{season.losses}{season.ties ? `–${season.ties}` : ''}</td>
                  <td className="px-4 py-3 text-right">{season.points_for.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right text-gray-400">{season.points_against.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-white">#{season.final_rank ?? '—'}</td>
                  <td className="px-4 py-3 text-right text-blue-400">
                    {season.finish_percentile !== null ? `${season.finish_percentile.toFixed(1)}%` : '—'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {season.is_champion || season.final_rank === 1
                      ? '🏆'
                      : season.final_rank === 2
                        ? '🥈'
                        : season.final_rank === 3
                          ? '🥉'
                          : season.made_playoffs
                            ? 'Playoffs'
                            : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </PageWrapper>
  )
}
