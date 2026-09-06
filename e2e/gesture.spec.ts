import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { watchConsole } from './console'

test.beforeEach(({ page }) => watchConsole(page))

test('page is accessible and has no horizontal overflow', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Pull to refresh without owning your feed.',
  )
  await expect(
    page.getByRole('button', { name: 'Refresh', exact: true }),
  ).toBeVisible()
  const sizes = await page.evaluate(() => ({
    client: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth,
  }))
  expect(sizes.scroll).toBe(sizes.client)
})

test('hero exposes prerelease status and live pull mechanics', async ({
  page,
}) => {
  await page.goto('/')

  await expect(page.getByText('0.1 alpha', { exact: true })).toBeVisible()
  const root = page.getByTestId('main-demo')
  const metrics = page.getByTestId('hero-metrics')
  await expect(metrics.getByText('72 px', { exact: true })).toBeVisible()
  await expect(metrics.getByText('idle', { exact: true })).toBeVisible()

  const box = await root.boundingBox()
  if (!box) throw new Error('Demo root has no box')
  const x = box.x + box.width / 2
  const y = box.y + 120
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.mouse.move(x, y + 92, { steps: 8 })

  await expect(metrics.getByText('armed', { exact: true })).toBeVisible()
  await expect(metrics.getByTestId('metric-distance')).not.toHaveText('0 px')
  await page.mouse.up()
})

test('gesture lab demonstrates rejected refresh recovery', async ({ page }) => {
  await page.goto('/#gesture-lab')

  const lab = page.getByTestId('gesture-lab')
  await expect(lab.getByRole('heading', { name: 'Gesture Lab' })).toBeVisible()
  await lab.getByLabel('Refresh result').selectOption('reject')
  await lab.getByRole('button', { name: 'Run refresh' }).click()
  await expect(lab.getByText('Rejected safely')).toBeVisible()
  await expect(lab.getByTestId('lab-root')).toHaveAttribute(
    'data-state',
    'idle',
  )
})

test('documents ownership, native refresh, and truthful device status', async ({
  page,
}) => {
  await page.goto('/')

  const ownership = page.getByTestId('ownership-flow')
  await expect(ownership.getByText('scrollTop > 0')).toBeVisible()
  await expect(ownership.getByText('Scroll container')).toBeVisible()
  await expect(ownership.getByText('Sibling interaction')).toBeVisible()

  const browser = page.getByTestId('browser-native-ptr')
  await expect(
    browser.getByRole('heading', { name: 'Browser-native pull-to-refresh' }),
  ).toBeVisible()
  await expect(
    browser.getByText('overscroll-behavior-y: contain;'),
  ).toBeVisible()
  await expect(browser.getByText(/Manual pending/).first()).toBeVisible()
})

test('renders real sibling primitive integration proofs', async ({ page }) => {
  await page.goto('/#integrations')

  await expect(
    page.getByRole('link', { name: 'React Swipe Actions' }),
  ).toHaveAttribute('href', 'https://react-swipe-actions.nipesolutions.com/')
  await expect(
    page.getByRole('link', { name: 'React Spring Bottom Sheet' }),
  ).toHaveAttribute(
    'href',
    'https://react-spring-bottom-sheet.nipesolutions.com/',
  )

  const swipe = page.getByTestId('swipe-integration')
  await expect(swipe).toHaveAttribute('data-integration', 'swipe-actions')
  await expect(swipe.locator('.swipe-actions-root').first()).toBeVisible()

  await page.getByRole('button', { name: 'Open bottom sheet proof' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.getByTestId('sheet-ptr')).toBeVisible()
  await page.getByRole('button', { name: 'Close sheet proof' }).click()
})

test('sheet content keeps the native scroll direction available at its top boundary', async ({
  page,
}) => {
  await page.goto('/#integrations')
  await page.getByRole('button', { name: 'Open bottom sheet proof' }).click()

  const root = page.getByTestId('sheet-ptr')
  await expect(root).toHaveAttribute('data-at-top', 'true')
  const touchAction = await root.evaluate(
    (node) => window.getComputedStyle(node).touchAction,
  )
  expect(['pan-x pan-down pinch-zoom', 'auto']).toContain(touchAction)

  const scroll = page.locator('.sheet-scroll')
  const dimensions = await scroll.evaluate((node) => ({
    clientHeight: node.clientHeight,
    scrollHeight: node.scrollHeight,
  }))
  expect(dimensions.scrollHeight).toBeGreaterThan(dimensions.clientHeight)
  await scroll.hover()
  await page.mouse.wheel(0, 180)
  await expect
    .poll(() => scroll.evaluate((node) => node.scrollTop))
    .toBeGreaterThan(0)
})

test('sheet feed owns a gradual downward pull before the sheet can claim it', async ({
  page,
}) => {
  await page.goto('/#integrations')
  await page.getByRole('button', { name: 'Open bottom sheet proof' }).click()

  const sheet = page.getByRole('dialog')
  await expect(sheet).toHaveAttribute('data-rsbs-state', 'open')
  const initialPosition = await sheet.evaluate((node) =>
    node.style.getPropertyValue('--rsbs-position'),
  )
  const root = page.getByTestId('sheet-ptr')
  const box = await root.boundingBox()
  if (!box) throw new Error('Sheet PTR root has no box')
  const x = box.x + box.width / 2
  const y = box.y + 80

  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.mouse.move(x, y + 2)
  await page.mouse.move(x, y + 30, { steps: 6 })

  await expect(root).toHaveAttribute('data-state', 'pulling')
  await expect
    .poll(() =>
      sheet.evaluate((node) => node.style.getPropertyValue('--rsbs-position')),
    )
    .toBe(initialPosition)
  await page.mouse.up()
})

test('Swipe Actions owns a horizontal row trace', async ({ page }) => {
  await page.goto('/#integrations')
  const row = page.locator('.swipe-actions-root').first()
  const surface = row.locator('[data-swipe-actions-content]')
  await surface.scrollIntoViewIfNeeded()
  const box = await surface.boundingBox()
  if (!box) throw new Error('Swipe row has no box')

  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  for (let step = 1; step <= 8; step += 1) {
    await page.mouse.move(
      box.x + box.width / 2 - (110 / 8) * step,
      box.y + box.height / 2 + (2 / 8) * step,
    )
    await page.waitForTimeout(20)
  }
  await expect(surface).not.toHaveCSS('transform', 'none')
  await expect(row).toHaveAttribute('data-revealing-side', 'trailing')
  await expect(row.locator('[data-swipe-actions-action]')).toBeVisible()
  await expect(
    page.getByTestId('swipe-integration').locator('.integration-scroll'),
  ).toHaveAttribute('data-state', 'idle')
  await page.mouse.up()
})

test('shows the accessible equivalent refresh pattern', async ({ page }) => {
  await page.goto('/#accessibility')

  const section = page.getByTestId('accessible-refresh')
  await expect(section.getByText('<button onClick={refresh}>')).toBeVisible()
  await expect(section.getByText(/Gesture is an enhancement/)).toBeVisible()
})

test('homepage has no detectable accessibility violations', async ({
  page,
}) => {
  await page.goto('/')
  const results = await new AxeBuilder({ page }).analyze()
  expect(
    results.violations.map(({ id, nodes }) => ({
      id,
      targets: nodes.map(({ target }) => target),
    })),
  ).toEqual([])
})

test('compact layout preserves the vertical evidence without overflow', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')

  const sizes = await page.evaluate(() => ({
    client: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth,
  }))
  expect(sizes.scroll).toBe(sizes.client)
  await expect(page.getByTestId('hero-metrics')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Gesture Lab' })).toBeVisible()
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

for (const selector of [
  '[data-testid=main-demo]',
  '[data-testid=lab-root]',
  '.integration-scroll',
]) {
  test(`short desktop demo ${selector} refreshes independently of page scroll`, async ({
    page,
  }) => {
    await page.goto('/')
    const root = page.locator(selector)
    await root.scrollIntoViewIfNeeded()
    if (await page.evaluate(() => scrollY === 0))
      await page.evaluate(() => scrollTo(0, 100))
    await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(0)
    const box = await root.boundingBox()
    if (!box) throw Error('Demo missing')
    const x = box.x + box.width / 2,
      y = box.y + 80
    await page.mouse.move(x, y)
    await page.mouse.down()
    await page.mouse.move(x, y + 95, { steps: 10 })
    await expect(root).toHaveAttribute('data-state', 'armed')
    await page.mouse.up()
    await expect(root).toHaveAttribute('data-state', 'refreshing')
    await expect(root).toHaveAttribute('data-state', 'idle')
  })
}
