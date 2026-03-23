import { useState } from 'react'
import PageWrapper from '../components/layout/PageWrapper'
import WinRateBarChart from '../components/charts/WinRateBarChart'
import LoadingSpinner from '../components/cards/LoadingSpinner'
import ErrorMessage from '../components/cards/ErrorMessage'
import YearFilter from '../components/cards/YearFilter'
import ExplainerCard from '../components/cards/ExplainerCard'
import { useApi } from '../hooks/useApi'
import { useSortedTable } from '../hooks/useSortedTable'
import { statsApi, seasonsApi } from '../api/client'
import type { LuckIndexRow, SeasonSummary } from '../types'

type SortKey = 'manager_name' | 'actual_wins' | 'expected_wins' | 'luck_score'

export default function LuckIndex() {
  const [year, setYear] = useState<number | undefined>(undefined)
  const { data: seasons } = useApi<SeasonSummary[]>(() => seasonsApi.list(), [])
  const { data, loading, error } = useApi<LuckIndexRow[]>(() => statsApi.luckIndex(year), [year])
  const { sorted, th } = useSortedTable<LuckIndexRow, SortKey>(data, 'luck_score')

  const barData = (data ?? []).map(r => ({
    name: r.manager_name.split(' ')[0],
    value: r.luck_score,
  }))

  return (
    <PageWrapper
      title="Luck Index"
      subtitle="How lucky has each manager been? Positive = got luckier than expected. Negative = deserved better."
      dataScope="regular"
    >
      <ExplainerCard>
        Each week, we calculate how many other teams you would have beaten with your score. That gives an "expected wins" number. Your luck score = actual wins − expected wins. Positive means you benefited from favorable scheduling. Negative means you were unlucky.
      </ExplainerCard>

      <YearFilter seasons={seasons} year={year} onChange={setYear} />

      {loading && <LoadingSpinner />}
      {error && <ErrorMessage message={error} />}

      {data && (
        <>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
            <WinRateBarChart data={barData} label="Luck Score" formatValue={v => v.toFixed(2)} />
          </div>

          <div className="overflow-x-auto rounded-xl border border-gray-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-900 text-gray-400 text-xs uppercase tracking-wider">
                  {th('Manager', 'manager_name', 'left')}
                  {th('Actual Wins', 'actual_wins')}
                  {th('Expected Wins', 'expected_wins')}
                  {th('Luck Score', 'luck_score')}
                </tr>
              </thead>
              <tbody>
                {sorted.map(r => (
                  <tr key={r.manager_id} className="border-t border-gray-800 hover:bg-gray-800 transition-colors">
                    <td className="px-4 py-3 font-medium text-white">{r.manager_name}</td>
                    <td className="px-4 py-3 text-right">{r.actual_wins}</td>
                    <td className="px-4 py-3 text-right text-gray-400">{r.expected_wins.toFixed(1)}</td>
                    <td className={`px-4 py-3 text-right font-bold ${r.luck_score > 0 ? 'text-green-400' : r.luck_score < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                      {r.luck_score > 0 ? '+' : ''}{r.luck_score.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </PageWrapper>
  )
}
