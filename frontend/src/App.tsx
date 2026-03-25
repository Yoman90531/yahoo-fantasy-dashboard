import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Sidebar from './components/layout/Sidebar'
import Dashboard from './pages/Dashboard'
import SeasonView from './pages/SeasonView'
import AllTimeStats from './pages/AllTimeStats'
import ManagerProfile from './pages/ManagerProfile'
import HeadToHead from './pages/HeadToHead'
import WeeklyRecords from './pages/WeeklyRecords'
import LuckIndex from './pages/LuckIndex'
import PowerRankings from './pages/PowerRankings'
import ThroneTracker from './pages/ThroneTracker'
import Awards from './pages/Awards'
import Rivalry from './pages/Rivalry'
import ScoringDistribution from './pages/ScoringDistribution'
import WeeklyFinishDistribution from './pages/WeeklyFinishDistribution'
import ManagerEras from './pages/ManagerEras'
import SyncStatus from './pages/SyncStatus'
import ProjectionPerformance from './pages/ProjectionPerformance'
import WinMargins from './pages/WinMargins'
import PlayoffPerformance from './pages/PlayoffPerformance'
import SeasonReplay from './pages/SeasonReplay'
import LeagueParity from './pages/LeagueParity'
import StreakTracker from './pages/StreakTracker'
import ConsolationBracket from './pages/ConsolationBracket'
import ManagerTiers from './pages/ManagerTiers'
import StrengthOfSchedule from './pages/StrengthOfSchedule'
import DraftAnalysis from './pages/DraftAnalysis'
import WhatIfSimulator from './pages/WhatIfSimulator'
import ClutchRating from './pages/ClutchRating'

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 overflow-auto pt-12 md:pt-0">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/seasons" element={<SeasonView />} />
            <Route path="/alltime" element={<AllTimeStats />} />
            <Route path="/managers/:id" element={<ManagerProfile />} />
            <Route path="/headtohead" element={<HeadToHead />} />
            <Route path="/weekly-records" element={<WeeklyRecords />} />
            <Route path="/luck-index" element={<LuckIndex />} />
            <Route path="/power-rankings" element={<PowerRankings />} />
            <Route path="/throne-tracker" element={<ThroneTracker />} />
            <Route path="/awards" element={<Awards />} />
            <Route path="/rivalry" element={<Rivalry />} />
            <Route path="/scoring-distribution" element={<ScoringDistribution />} />
            <Route path="/weekly-finish" element={<WeeklyFinishDistribution />} />
            <Route path="/manager-eras" element={<ManagerEras />} />
            <Route path="/projections" element={<ProjectionPerformance />} />
            <Route path="/win-margins" element={<WinMargins />} />
            <Route path="/playoff-performance" element={<PlayoffPerformance />} />
            <Route path="/season-replay" element={<SeasonReplay />} />
            <Route path="/league-parity" element={<LeagueParity />} />
            <Route path="/streaks" element={<StreakTracker />} />
            <Route path="/consolation" element={<ConsolationBracket />} />
            <Route path="/manager-tiers" element={<ManagerTiers />} />
            <Route path="/strength-of-schedule" element={<StrengthOfSchedule />} />
            <Route path="/draft-analysis" element={<DraftAnalysis />} />
            <Route path="/what-if" element={<WhatIfSimulator />} />
            <Route path="/clutch-rating" element={<ClutchRating />} />
            <Route path="/sync" element={<SyncStatus />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
