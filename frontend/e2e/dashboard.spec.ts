import { expect, test, type Page } from '@playwright/test'

const seasonSummary = {
  id: 1,
  year: 2023,
  yahoo_league_key: 'test.l.1',
  num_teams: 10,
  num_regular_season_weeks: 14,
  num_playoff_teams: 6,
  champion_manager_id: 1,
  champion_name: 'Dan',
}

const danPlacement = {
  placement_rank: 1,
  manager_id: 1,
  manager_name: 'Dan',
  seasons_played: 3,
  ranked_seasons: 3,
  average_finish: 2.33,
  median_finish: 2,
  finish_percentile: 85.2,
  best_finish: 1,
  worst_finish: 4,
  championships: 1,
  runner_ups: 1,
  top_three_finishes: 2,
  top_three_rate: 0.6667,
  last_place_finishes: 0,
  last_place_rate: 0,
  playoff_appearances: 3,
  playoff_rate: 1,
}

const managerStats = {
  id: 1,
  display_name: 'Dan',
  nickname: null,
  seasons_played: 3,
  total_wins: 24,
  total_losses: 15,
  total_ties: 0,
  win_pct: 0.6154,
  total_points_for: 4800,
  total_points_against: 4500,
  pf_pa_ratio: 1.0667,
  championships: 1,
  runner_ups: 1,
  playoff_appearances: 3,
  best_finish: 1,
  worst_finish: 4,
  average_finish: 2.33,
  median_finish: 2,
  finish_percentile: 85.2,
  top_three_finishes: 2,
  last_place_finishes: 0,
  playoff_rate: 1,
  current_drought: 0,
}

const keeperTeams = [
  ...Array.from({ length: 12 }, (_, index) => ({
    key: `team:${index + 1}`,
    name: index === 0 ? 'Dan' : index === 1 ? 'Karna' : `Owner ${index + 1}`,
    team_name: `Team ${index + 1}`,
    is_expansion: false,
    round_capacities: {},
  })),
  { key: 'expansion:nabi', name: 'Nabi', team_name: 'Expansion team', is_expansion: true, round_capacities: {} },
  { key: 'expansion:squilly', name: 'Squilly', team_name: 'Expansion team', is_expansion: true, round_capacities: {} },
]

const keeperBoard = {
  rules: {
    season: 2026,
    source_season: 2025,
    league_size: 14,
    draft_rounds: 16,
    scoring_format: 'half_ppr',
    adp_source: 'FantasyPros Half-PPR Consensus ADP',
    adp_url: 'https://www.fantasypros.com/nfl/adp/half-point-ppr-overall.php',
    recap: [
      'Owners may select up to three keepers.',
      'A player may be kept for at most three consecutive seasons.',
    ],
  },
  teams: keeperTeams,
  candidates: [
    {
      candidate_id: 'yahoo:1',
      yahoo_player_id: '1',
      player_name: 'Jahmyr Gibbs',
      position: 'RB',
      nfl_team: 'DET',
      roster_team_key: 'team:1',
      roster_team_name: 'Team 1',
      manager_name: 'Dan',
      draft_round: 3,
      draft_pick: 29,
      acquisition_label: 'Round 3',
      kept_previous_year: false,
      consecutive_keeper_years: 0,
      is_dynasty: false,
      dynasty_year: null,
      dynasty_locked_round: null,
      history_known: true,
      eligibility_status: 'eligible',
      eligibility_reason: 'Eligible under the configured keeper rules.',
      adp_rank: 1,
      adp_round: 1,
      average_adp: 1.5,
      base_keeper_round: 3,
      value_rounds: 2,
      value_rating: 'Good',
    },
    {
      candidate_id: 'yahoo:2',
      yahoo_player_id: '2',
      player_name: 'Amon-Ra St. Brown',
      position: 'WR',
      nfl_team: 'DET',
      roster_team_key: 'team:2',
      roster_team_name: 'Jamarcus Susseles',
      manager_name: 'Lowell',
      draft_round: 2,
      draft_pick: 18,
      acquisition_label: 'Round 2',
      kept_previous_year: true,
      consecutive_keeper_years: 1,
      is_dynasty: false,
      dynasty_year: null,
      dynasty_locked_round: null,
      history_known: true,
      eligibility_status: 'eligible',
      eligibility_reason: 'Eligible under the configured keeper rules.',
      adp_rank: 8,
      adp_round: 1,
      average_adp: 8,
      base_keeper_round: 1,
      value_rounds: 0,
      value_rating: 'Fair',
    },
  ],
  adp_snapshot: {
    id: 1,
    source: 'FantasyPros Half-PPR Consensus ADP',
    source_url: 'https://www.fantasypros.com/nfl/adp/half-point-ppr-overall.php',
    captured_at: '2026-08-17T19:00:00',
    player_count: 3,
    is_locked: true,
  },
  adp_players: [
    { rank: 1, player_name: 'Jahmyr Gibbs', position: 'RB', nfl_team: 'DET', average_adp: 1.5, adp_round: 1 },
    { rank: 2, player_name: 'Bijan Robinson', position: 'RB', nfl_team: 'ATL', average_adp: 1.5, adp_round: 1 },
    { rank: 3, player_name: "Ja'Marr Chase", position: 'WR', nfl_team: 'CIN', average_adp: 3, adp_round: 1 },
  ],
  data_warnings: [],
}

async function mockApi(page: Page) {
  await page.route('**/fantasy/api/**', async route => {
    const url = new URL(route.request().url())
    let body: unknown = {}

    if (url.pathname.endsWith('/keepers/board')) {
      body = keeperBoard
    } else if (url.pathname.endsWith('/seasons')) {
      body = [seasonSummary]
    } else if (url.pathname.endsWith('/managers/1/streak')) {
      body = {
        best_win_streak: 6,
        best_loss_streak: 3,
        current_streak_type: 'W',
        current_streak_length: 2,
      }
    } else if (url.pathname.endsWith('/managers/1')) {
      body = {
        manager: {
          id: 1,
          yahoo_guid: 'dan-test',
          display_name: 'Dan',
          nickname: null,
        },
        summary: {
          placement: danPlacement,
          favorite_opponent: {
            manager_id: 2,
            manager_name: 'Karna',
            games: 12,
            wins: 8,
            losses: 4,
            ties: 0,
            win_pct: 0.6667,
            points_for: 1400,
            points_against: 1300,
            point_diff: 100,
          },
          nemesis: {
            manager_id: 3,
            manager_name: 'Lowell',
            games: 10,
            wins: 3,
            losses: 7,
            ties: 0,
            win_pct: 0.3,
            points_for: 1100,
            points_against: 1250,
            point_diff: -150,
          },
          closest_rivalry: {
            manager_id: 4,
            manager_name: 'Jeremy',
            games: 14,
            wins: 7,
            losses: 7,
            ties: 0,
            win_pct: 0.5,
            points_for: 1600,
            points_against: 1598,
            point_diff: 2,
          },
          signature_season: {
            year: 2023,
            team_name: 'Dan Yo Jones',
            final_finish: 1,
            finish_percentile: 100,
            wins: 10,
            losses: 3,
            ties: 0,
            points_for: 1700,
            is_champion: true,
          },
          badges: [
            {
              key: 'league-champion',
              label: 'League Champion',
              icon: 'trophy',
              description: '1 league championship.',
            },
          ],
        },
        season_history: [
          {
            year: 2023,
            team_name: 'Dan Yo Jones',
            wins: 10,
            losses: 3,
            ties: 0,
            points_for: 1700,
            points_against: 1500,
            final_rank: 1,
            made_playoffs: true,
            is_champion: true,
            playoff_finish: 1,
            num_teams: 10,
            finish_percentile: 100,
          },
        ],
      }
    } else if (url.pathname.endsWith('/managers')) {
      body = [managerStats]
    } else if (url.pathname.endsWith('/seasons/2023')) {
      body = {
        ...seasonSummary,
        standings: [],
      }
    } else if (url.pathname.endsWith('/stats/manager-placements')) {
      body = [
        danPlacement,
        {
          ...danPlacement,
          placement_rank: 2,
          manager_id: 2,
          manager_name: 'Karna',
          average_finish: 4.5,
          median_finish: 4.5,
          finish_percentile: 61.1,
          best_finish: 2,
          worst_finish: 7,
          championships: 0,
          runner_ups: 1,
          top_three_finishes: 1,
          playoff_appearances: 2,
          playoff_rate: 0.6667,
        },
      ]
    } else if (url.pathname.includes('/stats/insight-rankings/')) {
      body = {
        insight_key: url.pathname.split('/').pop(),
        groups: [
          {
            metric_key: 'average_finish',
            title: 'Best Average Finish',
            description: 'Lower is better.',
            higher_is_better: false,
            entries: [
              {
                rank: 1,
                manager_id: 1,
                manager_name: 'Dan',
                value: 2.33,
                display_value: '2.33',
              },
              {
                rank: 2,
                manager_id: 2,
                manager_name: 'Karna',
                value: 4.5,
                display_value: '4.50',
              },
            ],
          },
        ],
      }
    } else if (url.pathname.endsWith('/stats/trophy-case/1')) {
      body = {
        manager_id: 1,
        manager_name: 'Dan',
        championships: [2023],
        runner_ups: [2022],
        playoff_appearances: [2021, 2022, 2023],
        best_regular_season: 2023,
      }
    } else if (url.pathname.endsWith('/stats/throne-tracker')) {
      body = {
        timeline: [{ year: 2023, champion_id: 1, champion_name: 'Dan' }],
        dynasties: [],
      }
    } else if (url.pathname.endsWith('/stats/awards')) {
      body = { year: null, awards: [] }
    } else if (url.pathname.endsWith('/stats/headtohead')) {
      body = { managers: [], records: [] }
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(body),
    })
  })
}

test.beforeEach(async ({ page }) => {
  await mockApi(page)
})

test('league headquarters renders its historical overview', async ({ page }) => {
  await page.goto('/fantasy/')

  await expect(page.getByRole('heading', { name: 'GARYS League HQ' })).toBeVisible()
  const draftCalendar = page.getByRole('region', { name: '2026 Draft Calendar' })
  const keyInsights = page.getByRole('region', { name: 'Key insights' })

  await expect(draftCalendar).toBeVisible()
  await expect(draftCalendar.getByText('Pre-draft action center')).toBeVisible()
  await expect(keyInsights).toBeVisible()

  const [draftCalendarBox, keyInsightsBox] = await Promise.all([
    draftCalendar.boundingBox(),
    keyInsights.boundingBox(),
  ])
  expect(draftCalendarBox).not.toBeNull()
  expect(keyInsightsBox).not.toBeNull()
  expect(draftCalendarBox!.y).toBeLessThan(keyInsightsBox!.y)

  await expect(page.getByRole('heading', { name: 'Championship Timeline' })).toBeVisible()
})

test('secret Karna headquarters is unlisted and renders the prank insights', async ({ page }) => {
  await page.goto('/fantasy/karna')

  await expect(page.getByRole('heading', { name: 'GARYS League HQ' })).toBeVisible()
  await expect(page.getByRole('region', { name: '2026 Draft Calendar' })).toBeVisible()
  await expect(
    page.getByRole('region', { name: 'Key insights' }).getByText(
      'Three championships are doing heroic PR for Karna’s 89–98 career record—a 47.6% win rate over 14 seasons.',
    ),
  ).toBeVisible()
  await expect(
    page.getByRole('navigation', { name: 'Primary' }).getByRole('link', { name: 'Karna' }),
  ).toHaveCount(0)
})

test('season archive loads the latest season', async ({ page }) => {
  await page.goto('/fantasy/seasons/archive')

  await expect(page.getByRole('heading', { name: 'Season Archive' })).toBeVisible()
  await expect(page.getByLabel('Season:')).toHaveValue('2023')
  await expect(page.getByText('10 teams')).toBeVisible()
})

test('mobile key insights open by default and remain collapsible', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/fantasy/')

  const toggle = page.getByRole('button', { name: 'Key Insights 2012–2025' })
  const firstInsight = page.getByText(
    'Fourteen seasons produced nine different champions—and no back-to-back winner.',
  )

  await expect(toggle).toHaveAttribute('aria-expanded', 'true')
  await expect(firstInsight).toBeVisible()

  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-expanded', 'false')
  await expect(firstInsight).toBeHidden()

  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-expanded', 'true')
  await expect(firstInsight).toBeVisible()
})

test('mobile navigation reaches rivalries', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/fantasy/')

  await page.getByRole('button', { name: 'Open menu' }).click()
  await page.getByRole('link', { name: 'Rivalries' }).click()

  await expect(page).toHaveURL(/\/fantasy\/rivalries$/)
  await expect(page.getByRole('heading', { name: 'Rivalries' })).toBeVisible()
  await expect(page.getByText('No matchup data yet')).toBeVisible()
})

test('keeper lab is highlighted first and supports a private league scenario', async ({ page }) => {
  await page.goto('/fantasy/keepers')

  const primaryNav = page.getByRole('navigation', { name: 'Primary' })
  await expect(primaryNav.getByRole('link').first()).toContainText('Keeper Lab')
  await expect(primaryNav.getByRole('link').first()).toHaveAttribute('aria-current', 'page')
  await expect(page.getByRole('heading', { name: 'Keeper Lab' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Keeper rules at a glance' })).toBeVisible()
  await expect(page.getByRole('cell', { name: 'Jahmyr Gibbs' })).toBeVisible()
  await expect(page.getByRole('cell', { name: 'Lowell', exact: true })).toBeVisible()
  await expect(page.getByRole('cell', { name: 'Jamarcus Susseles', exact: true })).toHaveCount(0)

  const playerHeader = page.getByRole('columnheader', { name: /Player/ })
  const boardRows = page.getByRole('table').locator('tbody tr')
  await playerHeader.getByRole('button').click()
  await expect(playerHeader).toHaveAttribute('aria-sort', 'ascending')
  await expect(boardRows.first().getByRole('cell').first()).toHaveText('Amon-Ra St. Brown')
  await playerHeader.getByRole('button').click()
  await expect(playerHeader).toHaveAttribute('aria-sort', 'descending')
  await expect(boardRows.first().getByRole('cell').first()).toHaveText('Jahmyr Gibbs')

  await page.getByRole('button', { name: 'Draft Simulator' }).click()
  await expect(page.getByText('League assumptions')).toBeVisible()
  await page.getByLabel('Active team').selectOption('expansion:nabi')
  await expect(page.getByText(/Expansion choices come from unkept players/)).toBeVisible()
  await expect(page.getByLabel('Nabi keeper 1')).toContainText('Jahmyr Gibbs')
})

test('finish leaderboard ranks final placements and opens a manager resume', async ({ page }) => {
  await page.goto('/fantasy/managers/finishes')

  await expect(page.getByRole('heading', { name: 'Finishes & Placements' })).toBeVisible()
  await expect(page.getByText('Best Average Finish')).toBeVisible()
  await expect(page.getByRole('cell', { name: '2.33' })).toBeVisible()

  await page.getByRole('cell', { name: 'Dan' }).click()
  await expect(page).toHaveURL(/\/fantasy\/managers\/1$/)
  await expect(page.getByText('#1 average finish')).toBeVisible()
})

test('manager resume shows earned identity and final placement history', async ({ page }) => {
  await page.goto('/fantasy/managers/1')

  await expect(page.getByRole('heading', { name: 'Dan' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Earned Badges' })).toBeVisible()
  await expect(page.getByText('1 league championship.', { exact: true })).toBeVisible()
  await expect(page.getByText('Favorite Opponent')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Karna' })).toHaveAttribute(
    'href',
    '/fantasy/rivalries/matchup?a=1&b=2',
  )
  await expect(page.getByText('Signature Season')).toBeVisible()
  await expect(page.getByRole('cell', { name: '100.0%' })).toBeVisible()
})

test('key insights expose the complete ranking behind the claim', async ({ page }) => {
  await page.goto('/fantasy/managers/all-time')

  await page.getByRole('button', { name: 'View complete rankings' }).click()
  await expect(page.getByRole('heading', { name: 'Best Average Finish' })).toBeVisible()
  await expect(page.getByText('#1')).toBeVisible()
  await expect(page.getByRole('link', { name: /Dan/ })).toBeVisible()
})
