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
