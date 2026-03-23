import PageWrapper from '../components/layout/PageWrapper'
import H2HHeatmap from '../components/charts/H2HHeatmap'
import LoadingSpinner from '../components/cards/LoadingSpinner'
import ErrorMessage from '../components/cards/ErrorMessage'
import { useApi } from '../hooks/useApi'
import { statsApi } from '../api/client'
import type { H2HMatrix } from '../types'

export default function HeadToHead() {
  const { data, loading, error } = useApi<H2HMatrix>(() => statsApi.headToHead(), [])

  return (
    <PageWrapper
      title="Head-to-Head"
      subtitle="All-time matchup records between every pair of managers. Cell value = wins. Hover for details."
    >
      {loading && <LoadingSpinner />}
      {error && <ErrorMessage message={error} />}
      {data && data.managers.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 overflow-x-auto">
          <H2HHeatmap data={data} />
        </div>
      )}
      {data && data.managers.length === 0 && (
        <p className="text-gray-500">No matchup data yet. Run a data sync first.</p>
      )}
    </PageWrapper>
  )
}
