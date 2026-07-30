import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom'
import Sidebar from './components/layout/Sidebar'
import HubLayout, { type HubTab } from './components/layout/HubLayout'
import Dashboard from './pages/Dashboard'
import SeasonView from './pages/SeasonView'
import AllTimeStats from './pages/AllTimeStats'
import ManagerProfile from './pages/ManagerProfile'
import HeadToHead from './pages/HeadToHead'
import WeeklyRecords from './pages/WeeklyRecords'
import LuckIndex from './pages/LuckIndex'
import CareerTiers from './pages/CareerTiers'
import Rivalry from './pages/Rivalry'
import ScoringDistribution from './pages/ScoringDistribution'
import WeeklyFinishDistribution from './pages/WeeklyFinishDistribution'
import SyncStatus from './pages/SyncStatus'
import ProjectionPerformance from './pages/ProjectionPerformance'
import WinMargins from './pages/WinMargins'
import PlayoffPerformance from './pages/PlayoffPerformance'
import SeasonReplay from './pages/SeasonReplay'
import LeagueParity from './pages/LeagueParity'
import StreakTracker from './pages/StreakTracker'
import ConsolationBracket from './pages/ConsolationBracket'
import StrengthOfSchedule from './pages/StrengthOfSchedule'
import DraftAnalysis from './pages/DraftAnalysis'
import FeedbackWall from './pages/FeedbackWall'

const seasonTabs: HubTab[] = [
  { label: 'Season Archive', to: '/seasons/archive' },
  { label: 'Week-by-Week', to: '/seasons/week-by-week' },
]

const managerTabs: HubTab[] = [
  { label: 'All-Time Standings', to: '/managers/all-time' },
  { label: 'Career Tiers', to: '/managers/tiers' },
]

const recordTabs: HubTab[] = [
  { label: 'Weekly Highs & Lows', to: '/record-book/weekly' },
  { label: 'Blowouts & Nail-Biters', to: '/record-book/margins' },
  { label: 'Hot & Cold Streaks', to: '/record-book/streaks' },
]

const scoringTabs: HubTab[] = [
  { label: 'League Trends', to: '/scoring/trends' },
  { label: 'Scoring Profiles', to: '/scoring/profiles' },
  { label: 'Weekly Rankings', to: '/scoring/weekly-rankings' },
  { label: 'Projection Accuracy', to: '/scoring/projections' },
]

const luckTabs: HubTab[] = [
  { label: 'Schedule Luck', to: '/luck-schedule/luck' },
  { label: 'Schedule Difficulty', to: '/luck-schedule/difficulty' },
]

const postseasonTabs: HubTab[] = [
  { label: 'Playoff Records', to: '/postseason/playoffs' },
  { label: 'Toilet Bowl', to: '/postseason/toilet-bowl' },
]

const draftTabs: HubTab[] = [
  { label: 'Draft Analysis', to: '/draft/analysis' },
  { label: 'Feedback Wall', to: '/draft/feedback' },
]

function LegacyRedirect({ to }: { to: string }) {
  const { search } = useLocation()
  return <Navigate to={`${to}${search}`} replace />
}

function AppRoutes() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto pt-12 md:pt-0">
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

          <Route
            path="/draft"
            element={<HubLayout title="Draft Room" subtitle="Draft history, league ideas, and what comes next." tabs={draftTabs} />}
          >
            <Route index element={<Navigate to="analysis" replace />} />
            <Route path="analysis" element={<DraftAnalysis />} />
            <Route path="feedback" element={<FeedbackWall />} />
          </Route>
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
          <Route path="/draft-analysis" element={<LegacyRedirect to="/draft/analysis" />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
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
