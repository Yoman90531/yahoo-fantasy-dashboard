import {
  Archive,
  BarChart3,
  BookOpen,
  ClipboardList,
  Crown,
  Dices,
  House,
  Medal,
  MessageSquare,
  Swords,
  type LucideIcon,
} from 'lucide-react'

export interface NavigationItem {
  to: string
  label: string
  activePrefix: string
  icon: LucideIcon
}

export interface HubTabConfig {
  label: string
  to: string
}

export const primaryNavigation: NavigationItem[] = [
  { to: '/', label: 'League HQ', activePrefix: '/', icon: House },
  { to: '/seasons/archive', label: 'Season Vault', activePrefix: '/seasons', icon: Archive },
  { to: '/managers/all-time', label: 'Manager Rankings', activePrefix: '/managers', icon: Crown },
  { to: '/rivalries', label: 'Rivalries', activePrefix: '/rivalries', icon: Swords },
  { to: '/record-book/weekly', label: 'Record Book', activePrefix: '/record-book', icon: BookOpen },
  { to: '/scoring/trends', label: 'Scoring Lab', activePrefix: '/scoring', icon: BarChart3 },
  { to: '/luck-schedule/luck', label: 'Luck & Schedule', activePrefix: '/luck-schedule', icon: Dices },
  { to: '/postseason/playoffs', label: 'Postseason', activePrefix: '/postseason', icon: Medal },
  { to: '/draft', label: 'Draft Room', activePrefix: '/draft', icon: ClipboardList },
  { to: '/feedback', label: 'Feedback Wall', activePrefix: '/feedback', icon: MessageSquare },
]

export const seasonTabs: HubTabConfig[] = [
  { label: 'Season Archive', to: '/seasons/archive' },
  { label: 'Week-by-Week', to: '/seasons/week-by-week' },
]

export const managerTabs: HubTabConfig[] = [
  { label: 'All-Time Standings', to: '/managers/all-time' },
  { label: 'Career Tiers', to: '/managers/tiers' },
]

export const recordTabs: HubTabConfig[] = [
  { label: 'Weekly Highs & Lows', to: '/record-book/weekly' },
  { label: 'Blowouts & Nail-Biters', to: '/record-book/margins' },
  { label: 'Hot & Cold Streaks', to: '/record-book/streaks' },
]

export const scoringTabs: HubTabConfig[] = [
  { label: 'League Trends', to: '/scoring/trends' },
  { label: 'Scoring Profiles', to: '/scoring/profiles' },
  { label: 'Weekly Rankings', to: '/scoring/weekly-rankings' },
  { label: 'Projection Accuracy', to: '/scoring/projections' },
]

export const luckTabs: HubTabConfig[] = [
  { label: 'Schedule Luck', to: '/luck-schedule/luck' },
  { label: 'Schedule Difficulty', to: '/luck-schedule/difficulty' },
]

export const postseasonTabs: HubTabConfig[] = [
  { label: 'Playoff Records', to: '/postseason/playoffs' },
  { label: 'Toilet Bowl', to: '/postseason/toilet-bowl' },
]
