import { useEffect } from 'react'
import PageWrapper from '../components/layout/PageWrapper'
import ChampionshipHistory from '../components/dashboard/ChampionshipHistory'
import AwardsSection from '../components/dashboard/AwardsSection'
import KeyDatesSection from '../components/dashboard/KeyDatesSection'
import { useAppStore } from '../store/appStore'
import { seasonsApi } from '../api/client'

export default function Dashboard() {
  const { seasons, setSeasons } = useAppStore()

  useEffect(() => {
    if (!seasons.length) seasonsApi.list().then(setSeasons)
  }, [])

  return (
    <PageWrapper title="GARYS League HQ" subtitle="Championship history, league lore, and the business ahead.">
      <section aria-labelledby="league-legacy-heading">
        <div className="mb-5">
          <h2 id="league-legacy-heading" className="text-xl font-bold text-white">League Legacy</h2>
          <p className="text-sm text-gray-400 mt-1">The belt, the bragging rights, and the performances nobody forgot.</p>
        </div>
        <ChampionshipHistory />
        <div className="border-t border-gray-800 mt-8 pt-8">
          <AwardsSection seasons={seasons} />
        </div>
      </section>

      <KeyDatesSection />
    </PageWrapper>
  )
}
