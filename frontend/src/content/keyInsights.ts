// All-time editorial takeaways for the completed 2012–2025 seasons.
export type InsightKey =
  | 'leagueHq'
  | 'karnaPrank'
  | 'seasonArchive'
  | 'weekByWeek'
  | 'allTimeStandings'
  | 'rivalries'
  | 'weeklyHighsLows'
  | 'blowoutsNailBiters'
  | 'hotColdStreaks'
  | 'leagueTrends'
  | 'scoringProfiles'
  | 'weeklyRankings'
  | 'projectionAccuracy'
  | 'scheduleLuck'
  | 'scheduleDifficulty'
  | 'playoffRecords'
  | 'toiletBowl'

export const KEY_INSIGHTS: Record<InsightKey, readonly string[]> = {
  leagueHq: [
    'Fourteen seasons produced nine different champions—and no back-to-back winner.',
    'Dan and Karna lead with three titles each; Lowell has two. Together, they own 8 of 14 championships.',
    'Karna has defined the recent era, winning three of the past five titles: 2021, 2023, and 2025.',
    'Six managers have won exactly one championship, underscoring the league’s broad title distribution.',
    'Lowell is the all-time scoring leader with 20,954.28 points and a league-high 32 weekly scoring crowns.',
  ],
  karnaPrank: [
    'Three championships are doing heroic PR for Karna’s 89–98 career record—a 47.6% win rate over 14 seasons.',
    'Karna owns the lowest weekly score in league history: 39.70 points against JK in Week 16 of 2012.',
    'He has missed the playoffs eight times in 14 seasons, more than any other manager in the league.',
    'When sent to the consolation bracket, Karna went 5–11—a 31.3% win rate—with an 80.85-point average.',
    'Karna once lost 11 straight games from Week 3 through Week 13 of 2015, the second-longest skid in league history.',
  ],
  seasonArchive: [
    'Lowell’s 2020 championship season set the best record: 12–1, a 92.3% win rate.',
    'Max scored a record 1,892.44 regular-season points in 2021—135.2 per week—but finished third.',
    'The regular-season wins leader became champion in only 6 of 14 seasons (42.9%).',
    'Tim went 11–3 in both 2023 and 2024 but finished second and fourth, respectively.',
    'The league expanded from 10 to 12 teams in 2016, then extended the regular season from 13 to 14 weeks in 2021.',
  ],
  weekByWeek: [
    'The archive contains 1,254 matchups with an average margin of 25.32 points.',
    'Kang’s 221.44 points in Week 5 of 2021 remain the highest weekly score.',
    'The closest result was Jeremy’s 139.74–139.62 win over Kang in 2018—a 0.12-point margin.',
    'Of all archived matchups, 443 were decided by at least 30 points, while 190 finished within five.',
    'The wildest season was 2023, when matchups averaged a record 30.48-point margin.',
  ],
  allTimeStandings: [
    'Michael owns the best win rate at 58.6% (41–29); Lowell follows at 57.8% across a much larger 187-game sample.',
    'Lowell leads the league in both regular-season wins (108) and points scored (20,954.28).',
    'Jeremy has 96 wins and eight playoff appearances—the strongest résumé without a championship.',
    'Bennett is the only other manager with 100 regular-season wins, reaching 101 with a 54.0% win rate.',
    'David is almost perfectly balanced: 93–94 with 19,927.56 points scored and 19,907.50 allowed.',
  ],
  rivalries: [
    'Lowell–Karna is the most-played rivalry: Lowell leads 14–11 across 25 meetings.',
    'Dan–Lowell is perfectly tied at 12–12, although Lowell holds a 134.84-point aggregate scoring advantage.',
    'Among rivalries with at least 10 games, Lowell’s 10–1 record against Himmel is the most lopsided.',
    'Bennett’s 15–8 advantage over Jeremy is the most wins any manager has recorded in one rivalry.',
    'Dan–Gottlieb is separated by one game and only 8.72 aggregate points after 17 meetings.',
  ],
  weeklyHighsLows: [
    'Kang’s 221.44-point performance against Lowell in 2021 is the league’s single-week record.',
    'Dan is the only other manager to reach 190, scoring 190.56 against Karna in 2019.',
    'Karna owns the lowest score: 39.70 against JK in Week 16 of 2012.',
    'The lowest winning score was JK’s 57.40–52.82 victory over David in 2017.',
    'Michael suffered the highest-scoring loss: 155.82–156.46 against David in 2025.',
  ],
  blowoutsNailBiters: [
    'Jeremy leads with 42 blowout wins, a 29.87-point average winning margin, and the record 105.26-point victory.',
    'Bennett ranks second with 36 blowout wins, followed by Lowell with 35.',
    'Dan has the most close wins (18), while David and Lowell share second with 16.',
    'Himmel owns the best close-game record at 12–6, winning 67% of games decided by fewer than five points.',
    'BFND has the largest average losing margin at 29.80; Tim suffered the largest single loss at 105.26 points.',
  ],
  hotColdStreaks: [
    'Max owns the longest winning streak: 11 games from Week 11 of 2017 through Week 8 of 2018.',
    'Lowell ranks second with a nine-game winning streak spanning 2020 and 2021.',
    'Tim owns the longest losing streak: 14 games from Week 2 of 2020 through Week 2 of 2021.',
    'Karna endured the second-longest losing streak, dropping 11 consecutive games in 2015.',
    'Jeremy and Kang share the longest open winning streak at three; BFND’s six-game skid is the longest open losing streak.',
  ],
  leagueTrends: [
    'The most competitive scoring season was 2016, with a 68.24-point scoring standard deviation and five-win record spread.',
    'The least balanced season was 2021, with a 167.77-point standard deviation and 538.66-point scoring range.',
    'Average scoring rose from 94.24 points in 2012 to 112.51 in 2025—a 19.4% increase.',
    'League scoring peaked at 116.01 points per team per week in 2020.',
    'The widest standings gap came in 2020, when 11 wins separated the best and worst records.',
  ],
  scoringProfiles: [
    'Michael owns the highest mean (115.87) and median (114.91) across 82 recorded weeks.',
    'Max ranks second in average scoring at 112.54 points across 173 weeks.',
    'Lowell leads the full 14-season managers with a 111.22-point average across 219 recorded weeks.',
    'Jeremy is the most volatile scorer at ±26.31 points; Gottlieb follows at ±25.92.',
    'Sandy is the steadiest at ±20.89 across 45 weeks; Kang leads the long-tenure managers at ±21.57.',
  ],
  weeklyRankings: [
    'Lowell leads with 25 first-place weeks and 109 top-half finishes in 187 weeks—a league-best 58.3%.',
    'Lowell and Jeremy share the most top-three finishes with 59 apiece.',
    'Michael ranks second in top-half frequency at 57.1%, finishing there in 40 of 70 weeks.',
    'Gottlieb has the most last-place weeks with 24, accounting for 16.2% of his weekly finishes.',
    'JK owns the lowest last-place rate at 2.6%, finishing last only twice in 78 weeks.',
  ],
  projectionAccuracy: [
    'BFND beat Yahoo’s projection by 6.32 points per week, the best average over his 39-week sample.',
    'Jeremy is the strongest long-term outperformer: +2.59 per week and +484.92 total across 187 weeks.',
    'Brink beat his projection in 56.4% of weeks, the highest frequency in the league.',
    'Michael averaged a league-high 115.58 actual points against a 113.62 projection, outperforming by 1.96 per week.',
    'Sandy has the lowest average at −7.67; Kang has the largest cumulative shortfall at −517.40 points.',
  ],
  scheduleLuck: [
    'BFND is the luckiest manager at +3.67 wins versus expectation, narrowly ahead of Michael at +3.64.',
    'Bennett ranks third at +3.56 wins, converting 97.44 expected wins into 101 actual victories.',
    'Himmel is the unluckiest: 58 actual wins versus 64.91 expected, a −6.91 differential.',
    'Himmel’s deficit is 3.07 wins worse than the next-lowest result, Max’s −3.84.',
    'Jeremy also underperformed his weekly scoring expectation, finishing 3.26 wins below his expected total.',
  ],
  scheduleDifficulty: [
    'Brink faced the toughest schedule overall at a 51.68% opponent win rate across 39 games.',
    'Among 14-season managers, Karna faced the toughest opponents at a combined 50.83% win rate.',
    'Lowell faced the easiest schedule at 48.42%, lowering his 57.8% actual win rate to 56.1% after adjustment.',
    'Karna receives the largest schedule adjustment: +1.41 wins and a rise from 47.6% to 48.3% adjusted win rate.',
    'Michael remains the standings leader after adjustment, moving only slightly from a 58.6% actual win rate to 58.4%.',
  ],
  playoffRecords: [
    'Dan leads with 12 playoff wins and a 70.6% postseason win rate across 17 games.',
    'Himmel shows the largest playoff improvement: +27.0 percentage points in win rate and +13.89 points per game.',
    'Karna is 11–5 in the playoffs and raises his scoring by a league-high 19.04 points per game.',
    'Michael owns the highest playoff scoring average at 122.92 points, producing a 5–4 record.',
    'Lowell has the most playoff games (25) but is 10–15, with his win rate falling 17.8 percentage points from the regular season.',
  ],
  toiletBowl: [
    'Himmel is the sustained Toilet Bowl leader at 12–4, a 75% win rate.',
    'Max is 10–4 and owns the highest consolation scoring average at 120.55 points.',
    'David ranks third in consolation wins, posting a 9–5 record and 64.3% win rate.',
    'Karna has missed the playoffs a league-high eight times and is 5–11 in consolation games—despite owning three championships.',
    'BFND is the only winless consolation manager, going 0–2 with a 70.08-point scoring average.',
  ],
}
