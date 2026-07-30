import PageWrapper from '../components/layout/PageWrapper'
import ManagerTiersPanel from '../components/analytics/ManagerTiersPanel'
import { useApi } from '../hooks/useApi'
import { seasonsApi } from '../api/client'
import type { SeasonSummary } from '../types'

export default function CareerTiers() {
  const { data: seasons } = useApi<SeasonSummary[]>(() => seasonsApi.list(), [])

  return (
    <PageWrapper
      title="Career Tiers"
      subtitle="The league hierarchy, built from results, scoring, schedule-adjusted performance, and postseason success."
    >
      <ManagerTiersPanel seasons={seasons} />
    </PageWrapper>
  )
}
