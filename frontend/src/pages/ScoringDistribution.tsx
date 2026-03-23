import { useState } from 'react'
import PageWrapper from '../components/layout/PageWrapper'
import BoxPlotChart from '../components/charts/BoxPlotChart'
import LoadingSpinner from '../components/cards/LoadingSpinner'
import ErrorMessage from '../components/cards/ErrorMessage'
import { useApi } from '../hooks/useApi'
import { statsApi } from '../api/client'
import type { ScoreDistributionRow } from '../types'

type SDSortKey = 'manager_name' | 'n' | 'min' | 'q1' | 'median' | 'mean' | 'q3' | 'max' | 'std_dev' | 'outlier_count'

export default function ScoringDistribution() {
  const { data, loading, error } = useApi<ScoreDistributionRow[]>(() => statsApi.scoreDistribution(), [])
  const [sort, setSort] = useState<{ key: SDSortKey; dir: 1 | -1 }>({ key: 'median', dir: -1 })

  const toggle = (key: SDSortKey) =>
    setSort(s => s.key === key ? { key, dir: (s.dir * -1) as 1 | -1 } : { key, dir: key === 'manager_name' ? 1 : -1 })

  const sorted = [...(data ?? [])].sort((a, b) => {
    if (sort.key === 'manager_name') return a.manager_name.localeCompare(b.manager_name) * sort.dir
    if (sort.key === 'outlier_count') return (a.outliers.length - b.outliers.length) * sort.dir
    return ((a[sort.key as keyof ScoreDistributionRow] as number) - (b[sort.key as keyof ScoreDistributionRow] as number)) * sort.dir
  })

  const th = (label: string, key: SDSortKey, align: 'left' | 'right' = 'right') => (
    <th className={`px-4 py-3 text-${align} cursor-pointer hover:text-white select-none`} onClick={() => toggle(key)}>
      {label} {sort.key === key ? (sort.dir === -1 ? '↓' : '↑') : ''}
    </th>
  )

  return (
    <PageWrapper
      title="Scoring Distribution"
      subtitle="Weekly score spread per manager across all seasons — sorted by median. Box = IQR (middle 50%), line = median, dot = mean, circles = outliers."
    >
      {loading && <LoadingSpinner />}
      {error && <ErrorMessage message={error} />}

      {data && (
        <>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
            <BoxPlotChart data={data} />
          </div>

          {/* Summary table */}
          <div className="overflow-x-auto rounded-xl border border-gray-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-900 text-gray-400 text-xs uppercase tracking-wider">
                  {th('Manager', 'manager_name', 'left')}
                  {th('Weeks', 'n')}
                  {th('Min', 'min')}
                  {th('Q1', 'q1')}
                  {th('Median', 'median')}
                  {th('Mean', 'mean')}
                  {th('Q3', 'q3')}
                  {th('Max', 'max')}
                  {th('Std Dev', 'std_dev')}
                  {th('Outliers', 'outlier_count')}
                </tr>
              </thead>
              <tbody>
                {sorted.map(d => (
                  <tr key={d.manager_id} className="border-t border-gray-800 hover:bg-gray-800 transition-colors">
                    <td className="px-4 py-3 font-medium text-white">{d.manager_name}</td>
                    <td className="px-4 py-3 text-right text-gray-400">{d.n}</td>
                    <td className="px-4 py-3 text-right text-red-400">{d.min.toFixed(1)}</td>
                    <td className="px-4 py-3 text-right text-gray-300">{d.q1.toFixed(1)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-white">{d.median.toFixed(1)}</td>
                    <td className="px-4 py-3 text-right text-blue-400">{d.mean.toFixed(1)}</td>
                    <td className="px-4 py-3 text-right text-gray-300">{d.q3.toFixed(1)}</td>
                    <td className="px-4 py-3 text-right text-green-400">{d.max.toFixed(1)}</td>
                    <td className="px-4 py-3 text-right text-amber-400">{d.std_dev.toFixed(1)}</td>
                    <td className="px-4 py-3 text-right text-gray-500">{d.outliers.length}</td>
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
