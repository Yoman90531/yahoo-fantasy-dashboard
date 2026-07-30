import { lazy, Suspense } from 'react'
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom'
import Sidebar from './components/layout/Sidebar'
import HubLayout from './components/layout/HubLayout'
import LoadingSpinner from './components/cards/LoadingSpinner'
import {
  luckTabs,
  managerTabs,
  postseasonTabs,
  recordTabs,
  scoringTabs,
  seasonTabs,
} from './config/navigation'

const Dashboard = lazy(() => import('./pages/Dashboard'))
const SeasonView = lazy(() => import('./pages/SeasonView'))
const AllTimeStats = lazy(() => import('./pages/AllTimeStats'))
const ManagerProfile = lazy(() => import('./pages/ManagerProfile'))
const HeadToHead = lazy(() => import('./pages/HeadToHead'))
const WeeklyRecords = lazy(() => import('./pages/WeeklyRecords'))
const LuckIndex = lazy(() => import('./pages/LuckIndex'))
const CareerTiers = lazy(() => import('./pages/CareerTiers'))
const Rivalry = lazy(() => import('./pages/Rivalry'))
const ScoringDistribution = lazy(() => import('./pages/ScoringDistribution'))
const WeeklyFinishDistribution = lazy(() => import('./pages/WeeklyFinishDistribution'))
const SyncStatus = lazy(() => import('./pages/SyncStatus'))
const ProjectionPerformance = lazy(() => import('./pages/ProjectionPerformance'))
const WinMargins = lazy(() => import('./pages/WinMargins'))
const PlayoffPerformance = lazy(() => import('./pages/PlayoffPerformance'))
const SeasonReplay = lazy(() => import('./pages/SeasonReplay'))
const LeagueParity = lazy(() => import('./pages/LeagueParity'))
const StreakTracker = lazy(() => import('./pages/StreakTracker'))
const ConsolationBracket = lazy(() => import('./pages/ConsolationBracket'))
const StrengthOfSchedule = lazy(() => import('./pages/StrengthOfSchedule'))
const DraftAnalysis = lazy(() => import('./pages/DraftAnalysis'))
const FeedbackWall = lazy(() => import('./pages/FeedbackWall'))

function LegacyRedirect({ to }: { to: string }) {
  const { search } = useLocation()
  return <Navigate to={`${to}${search}`} replace />
}

function AppRoutes() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto pt-12 md:pt-0">
        <Suspense fallback={<LoadingSpinner />}>
          <Routes>
          <Route path="/" element={<Dashboard />} />

          <Route
            path="/seasons"
            element={<HubLayout title="Season Vault" subtitle="Every season, standings table, and weekly receipt." tabs={seasonTabs} />}
          >
            <Route index element={<Navigate to="archive" replace />} />
            <Route path="archive" element={<SeasonView />} />
            <Route path="week-by-week" element={<SeasonReplay />} />
          </Route>

          <Route
            path="/managers"
            element={<HubLayout title="Manager Rankings" subtitle="Career resumes and the league pecking order." tabs={managerTabs} />}
          >
            <Route index element={<Navigate to="all-time" replace />} />
            <Route path="all-time" element={<AllTimeStats />} />
            <Route path="power" element={<LegacyRedirect to="/managers/tiers" />} />
            <Route path="tiers" element={<CareerTiers />} />
          </Route>
          <Route path="/managers/:id" element={<ManagerProfile />} />

          <Route path="/rivalries" element={<HeadToHead />} />
          <Route path="/rivalries/matchup" element={<Rivalry />} />

          <Route
            path="/record-book"
            element={<HubLayout title="Record Book" subtitle="The league's highest highs, lowest lows, and longest receipts." tabs={recordTabs} />}
          >
            <Route index element={<Navigate to="weekly" replace />} />
            <Route path="weekly" element={<WeeklyRecords />} />
            <Route path="margins" element={<WinMargins />} />
            <Route path="streaks" element={<StreakTracker />} />
          </Route>

          <Route
            path="/scoring"
            element={<HubLayout title="Scoring Lab" subtitle="How the league scores, changes, and beats the projections." tabs={scoringTabs} />}
          >
            <Route index element={<Navigate to="trends" replace />} />
            <Route path="trends" element={<LeagueParity />} />
            <Route path="profiles" element={<ScoringDistribution />} />
            <Route path="weekly-rankings" element={<WeeklyFinishDistribution />} />
            <Route path="projections" element={<ProjectionPerformance />} />
          </Route>

          <Route
            path="/luck-schedule"
            element={<HubLayout title="Luck & Schedule" subtitle="Who earned it, who escaped, and who got the brutal slate." tabs={luckTabs} />}
          >
            <Route index element={<Navigate to="luck" replace />} />
            <Route path="luck" element={<LuckIndex />} />
            <Route path="difficulty" element={<StrengthOfSchedule />} />
          </Route>

          <Route
            path="/postseason"
            element={<HubLayout title="Postseason" subtitle="Championship runs at the top; Toilet Bowl business at the bottom." tabs={postseasonTabs} />}
          >
            <Route index element={<Navigate to="playoffs" replace />} />
            <Route path="playoffs" element={<PlayoffPerformance />} />
            <Route path="toilet-bowl" element={<ConsolationBracket />} />
          </Route>

          <Route path="/draft" element={<DraftAnalysis />} />
          <Route path="/feedback" element={<FeedbackWall />} />
          <Route path="/sync" element={<SyncStatus />} />

          <Route path="/alltime" element={<LegacyRedirect to="/managers/all-time" />} />
          <Route path="/power-rankings" element={<LegacyRedirect to="/managers/tiers" />} />
          <Route path="/manager-tiers" element={<LegacyRedirect to="/managers/tiers" />} />
          <Route path="/headtohead" element={<LegacyRedirect to="/rivalries" />} />
          <Route path="/rivalry" element={<LegacyRedirect to="/rivalries/matchup" />} />
          <Route path="/weekly-records" element={<LegacyRedirect to="/record-book/weekly" />} />
          <Route path="/win-margins" element={<LegacyRedirect to="/record-book/margins" />} />
          <Route path="/streaks" element={<LegacyRedirect to="/record-book/streaks" />} />
          <Route path="/season-replay" element={<LegacyRedirect to="/seasons/week-by-week" />} />
          <Route path="/league-parity" element={<LegacyRedirect to="/scoring/trends" />} />
          <Route path="/scoring-distribution" element={<LegacyRedirect to="/scoring/profiles" />} />
          <Route path="/weekly-finish" element={<LegacyRedirect to="/scoring/weekly-rankings" />} />
          <Route path="/projections" element={<LegacyRedirect to="/scoring/projections" />} />
          <Route path="/luck-index" element={<LegacyRedirect to="/luck-schedule/luck" />} />
          <Route path="/strength-of-schedule" element={<LegacyRedirect to="/luck-schedule/difficulty" />} />
          <Route path="/playoff-performance" element={<LegacyRedirect to="/postseason/playoffs" />} />
          <Route path="/consolation" element={<LegacyRedirect to="/postseason/toilet-bowl" />} />
          <Route path="/draft/analysis" element={<LegacyRedirect to="/draft" />} />
          <Route path="/draft/feedback" element={<LegacyRedirect to="/feedback" />} />
          <Route path="/draft-analysis" element={<LegacyRedirect to="/draft" />} />
          <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </main>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter basename="/fantasy">
      <AppRoutes />
    </BrowserRouter>
  )
}
