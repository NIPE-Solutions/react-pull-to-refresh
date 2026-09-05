import { expect, test } from '@playwright/test'

test('page is accessible and has no horizontal overflow', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Pull to refresh for React, without owning your data.',
  )
  await expect(page.getByRole('button', { name: 'Refresh' })).toBeVisible()
  const sizes = await page.evaluate(() => ({
    client: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth,
  }))
  expect(sizes.scroll).toBe(sizes.client)
})

test('header identifies the primitive family without a hero eyebrow', async ({
  page,
}) => {
  await page.goto('/')

  const header = page.getByRole('banner')
  await expect(header.getByText('Primitives', { exact: true })).toBeVisible()
  await expect(
    header.getByRole('link', { name: 'NIPE Open Source' }),
  ).toHaveAttribute('href', 'https://opensource.nipesolutions.com')
  await expect(page.locator('.hero .family')).toHaveCount(0)
})

test('footer links to the website legal pages', async ({ page }) => {
  await page.goto('/')

  const legal = page.getByRole('navigation', { name: 'Legal' })
  await expect(legal.getByRole('link', { name: 'Imprint' })).toHaveAttribute(
    'href',
    '/imprint/',
  )
  await expect(legal.getByRole('link', { name: 'Privacy' })).toHaveAttribute(
    'href',
    '/privacy/',
  )
})

test('imprint publishes verified NIPE legal information', async ({ page }) => {
  await page.goto('/imprint/')

  await expect(page).toHaveTitle(/Imprint/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Imprint')
  await expect(page.getByText('NIPE Solutions e.U.')).toBeVisible()
  await expect(page.getByText('FN 585066t')).toBeVisible()
  await expect(page.getByText('ATU78464412')).toBeVisible()
})

test('privacy page documents the website data practices', async ({ page }) => {
  await page.goto('/privacy/')

  await expect(page).toHaveTitle(/Privacy/)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Privacy')
  await expect(page.getByText('Vercel Inc.')).toBeVisible()
  await expect(page.getByText(/does not use analytics/i)).toBeVisible()
  await expect(page.getByText(/served locally/i)).toBeVisible()
})

test('an armed mouse trace refreshes exactly once', async ({ page }) => {
  await page.goto('/')
  const root = page.getByTestId('main-demo')
  const box = await root.boundingBox()
  if (!box) throw new Error('Demo root has no box')
  await root.evaluate((element) => {
    element.scrollTop = 0
  })
  const x = box.x + box.width / 2
  const y = box.y + 120
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.mouse.move(x + 2, y + 92, { steps: 8 })
  await expect(root).toHaveAttribute('data-state', 'armed')
  await page.mouse.up()
  await expect(root).toHaveAttribute('data-state', 'refreshing')
  await expect(root.getByText('Inbox refreshed')).toHaveCount(1)
  await expect(root).toHaveAttribute('data-state', 'idle')
})

test('horizontal and below-threshold traces do not refresh', async ({
  page,
}) => {
  await page.goto('/')
  const root = page.getByTestId('main-demo')
  const box = await root.boundingBox()
  if (!box) throw new Error('Demo root has no box')
  const x = box.x + box.width / 2
  const y = box.y + 130

  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.mouse.move(x + 90, y + 8, { steps: 5 })
  await page.mouse.up()
  await expect(root).toHaveAttribute('data-state', 'idle')

  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.mouse.move(x, y + 35, { steps: 5 })
  await page.mouse.up()
  await expect(root.getByText('Inbox refreshed')).toHaveCount(0)
})
