import PageWrapper from '../components/layout/PageWrapper'
import AllTimeTable from '../components/tables/AllTimeTable'
import WinRateBarChart from '../components/charts/WinRateBarChart'
import LoadingSpinner from '../components/cards/LoadingSpinner'
import ErrorMessage from '../components/cards/ErrorMessage'
import KeyInsights from '../components/cards/KeyInsights'
import { useApi } from '../hooks/useApi'
import { managersApi } from '../api/client'
import type { ManagerStats } from '../types'

export default function AllTimeStats() {
  const { data: managers, loading, error } = useApi<ManagerStats[]>(() => managersApi.list(), [])

  if (loading) return <PageWrapper title="All-Time Standings"><LoadingSpinner /></PageWrapper>
  if (error) return <PageWrapper title="All-Time Standings"><ErrorMessage message={error} /></PageWrapper>
  if (!managers?.length) return <PageWrapper title="All-Time Standings"><p className="text-gray-500">No data yet. Run a data sync first.</p></PageWrapper>

  const barData = managers.map(m => ({
    name: m.display_name,
    value: parseFloat((m.win_pct * 100).toFixed(1)),
  }))

  const pfData = managers.map(m => ({
    name: m.display_name,
    value: m.total_points_for,
  }))

  return (
    <PageWrapper title="All-Time Standings" subtitle="Career resumes for every manager. Click a row to inspect the receipts." dataScope="all">
      <KeyInsights insightKey="allTimeStandings" />
      <AllTimeTable managers={managers} />

      <div className="grid md:grid-cols-2 gap-6 mt-8">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">Win Rate (%)</h2>
          <WinRateBarChart data={barData} label="Win %" formatValue={v => `${v}%`} />
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">Total Points Scored</h2>
          <WinRateBarChart data={pfData} label="Points" formatValue={v => v.toFixed(0)} />
        </div>
      </div>
    </PageWrapper>
  )
}
