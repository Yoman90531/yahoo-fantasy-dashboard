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

async function mockApi(page: Page) {
  await page.route('**/fantasy/api/**', async route => {
    const url = new URL(route.request().url())
    let body: unknown = {}

    if (url.pathname.endsWith('/seasons')) {
      body = [seasonSummary]
    } else if (url.pathname.endsWith('/seasons/2023')) {
      body = {
        ...seasonSummary,
        standings: [],
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
