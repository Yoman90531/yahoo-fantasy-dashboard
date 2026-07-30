import PageWrapper from '../components/layout/PageWrapper'
import H2HHeatmap from '../components/charts/H2HHeatmap'
import LoadingSpinner from '../components/cards/LoadingSpinner'
import ErrorMessage from '../components/cards/ErrorMessage'
import KeyInsights from '../components/cards/KeyInsights'
import { useApi } from '../hooks/useApi'
import { statsApi } from '../api/client'
import type { H2HMatrix } from '../types'

export default function HeadToHead() {
  const { data, loading, error } = useApi<H2HMatrix>(() => statsApi.headToHead(), [])

  return (
    <PageWrapper
      title="Rivalries"
      subtitle="The all-time beef matrix. Each cell shows wins from the row manager's perspective."
      dataScope="playoffs"
    >
      <KeyInsights insightKey="rivalries" />
      {loading && <LoadingSpinner />}
      {error && <ErrorMessage message={error} />}
      {data && data.managers.length > 0 && (
        <>
          <div className="mb-4 border-l-4 border-brand-500 bg-blue-950/60 px-4 py-3">
            <div className="text-sm font-semibold text-blue-200">Choose your beef</div>
            <p className="text-xs text-gray-300 mt-1">
              Click any colored matchup cell to see the full series, scoring history, and individual games.
            </p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 overflow-x-auto">
            <H2HHeatmap data={data} />
          </div>
        </>
      )}
      {data && data.managers.length === 0 && (
        <p className="text-gray-500">No matchup data yet. Run a data sync first.</p>
      )}
    </PageWrapper>
  )
}
