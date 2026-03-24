# Yahoo Fantasy Dashboard — TODO

## Pending
- [ ] Ability to define range of years to drive outputs (e.g., Manager Tiers)
- [ ] What If schedule simulator
- [ ] Clutch Rating for must-win games

## Requires New Yahoo API Sync
- [ ] Draft & Roster Analysis: position ROI vs draft capital, free agency effectiveness, drafting strategy tendencies (draft picks data)
- [ ] Player-Level Contributions (player stats data)
- [ ] Transaction Volume analysis (transactions data)
- [ ] Bench vs Starter Analysis (roster lineups data)

## Completed
- [x] Hyperlink game references to Yahoo Fantasy matchup pages (Rivalry, Season Replay, Weekly Records)
- [x] Build Strength of Schedule page
- [x] Build Manager Tiers / Clustering page
- [x] Add note on every page: regular season only or reg season + playoffs (PageWrapper dataScope prop)
- [x] Update Dashboard title to GARYS Fantasy Dashboard; update nav tiles to match grouped sidebar
- [x] H2H Rivalry History: sortable columns
- [x] Optimize site for mobile
- [x] Add more description to Power Rankings dimensions
- [x] Managers who outperform projections
- [x] H2H page: make cells obviously clickable
- [x] Rationalize information architecture (grouped sidebar)
- [x] Playoff vs Regular Season Performance page
- [x] Win Margin Analytics page
- [x] Streak Tracker page
- [x] League Parity Over Time page
- [x] Consolation Bracket King page
- [x] Season Replay / Matchup Browser page
- [x] Backend refactoring: deduplicated DB queries in stats_engine.py
- [x] Fix hidden managers in H2H and numeric IDs on multiple pages
- [x] Fix manager overrides (Lowell/Gottlieb showing as Andrew)
