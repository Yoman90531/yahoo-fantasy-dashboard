import { useEffect } from 'react'
import PageWrapper from '../components/layout/PageWrapper'
import ChampionshipHistory from '../components/dashboard/ChampionshipHistory'
import AwardsSection from '../components/dashboard/AwardsSection'
import KeyDatesSection from '../components/dashboard/KeyDatesSection'
import KeyInsights from '../components/cards/KeyInsights'
import { useAppStore } from '../store/appStore'
import { seasonsApi } from '../api/client'

export default function Dashboard() {
  const { seasons, setSeasons } = useAppStore()

  useEffect(() => {
    if (!seasons.length) seasonsApi.list().then(setSeasons)
  }, [])

  return (
    <PageWrapper title="GARYS League HQ" subtitle="Championship history, league lore, and the business ahead.">
      <KeyInsights insightKey="leagueHq" />
      <KeyDatesSection />

      <section aria-label="League history and superlatives" className="mt-10">
        <ChampionshipHistory />
        <div className="border-t border-gray-800 mt-8 pt-8">
          <AwardsSection seasons={seasons} />
        </div>
      </section>
    </PageWrapper>
  )
}
