import { expect, test, type Page } from '@playwright/test'

import { watchConsole } from './console'

test.beforeEach(({ page }) => watchConsole(page))
async function drag(
  page: Page,
  selector = '[data-testid=origin]',
  distance = 90,
) {
  const box = await page.locator(selector).boundingBox()
  if (!box) throw Error('Missing origin')
  const x = box.x + 60,
    y = box.y + 20
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.mouse.move(x, y + distance, { steps: 8 })
}
test('page root does not create overflow containment and sticky tracks Window', async ({
  page,
}) => {
  await page.goto('/qa/?mode=page')
  const root = page.getByTestId('qa-root')
  await expect(root).toHaveCSS('overflow-y', 'visible')
  await expect(root).toHaveCSS('overscroll-behavior-y', 'auto')
  await page.evaluate(() => window.scrollTo(0, 300))
  await expect
    .poll(() =>
      page
        .getByTestId('sticky')
        .evaluate((node) => node.getBoundingClientRect().top),
    )
    .toBe(0)
  await root.hover()
  await page.mouse.wheel(0, 150)
  await expect.poll(() => page.evaluate(() => scrollY)).toBeGreaterThan(300)
})
test('directional policy matches feature detection and preserves pinch zoom', async ({
  page,
}) => {
  await page.goto('/qa/?mode=element')
  const supports = await page.evaluate(() =>
    CSS.supports('touch-action', 'pan-x pan-down pinch-zoom'),
  )
  await expect(page.getByTestId('qa-root')).toHaveCSS(
    'touch-action',
    supports ? 'pan-x pan-down pinch-zoom' : 'auto',
  )
})
test('nested scroller retains downward movement below top', async ({
  page,
}) => {
  await page.goto('/qa/?mode=nested')
  await page.getByTestId('nested').evaluate((node) => {
    node.scrollTop = 40
  })
  await drag(page, '[data-testid=nested]')
  await expect(page.getByTestId('qa-root')).toHaveAttribute(
    'data-state',
    'idle',
  )
  await page.mouse.up()
})
test('delayed explicit ref becomes eligible without replacing the ref object', async ({
  page,
}) => {
  await page.goto('/qa/?mode=delayed')
  await drag(page)
  await expect(page.getByTestId('qa-root')).toHaveAttribute(
    'data-state',
    'idle',
  )
  await page.mouse.up()
  await page.getByText('Resolve ref', { exact: true }).click()
  await drag(page)
  await expect(page.getByTestId('qa-root')).toHaveAttribute(
    'data-state',
    'armed',
  )
  await page.mouse.up()
})
test('reject settles without core console noise', async ({ page }) => {
  await page.goto('/qa/?mode=element&reject')
  await drag(page)
  await page.mouse.up()
  await expect(page.getByTestId('qa-root')).toHaveAttribute(
    'data-state',
    'refreshing',
  )
  await expect(page.getByTestId('qa-root')).toHaveAttribute(
    'data-state',
    'idle',
  )
  await expect(page.getByTestId('count')).toHaveText('1')
})

for (const adapter of ['directional', 'fallback']) {
  for (const surface of ['element', 'page']) {
    test(`Chromium trusted touch ${adapter}/${surface}: downward claims, upward scrolls, horizontal abandons`, async ({
      browser,
      browserName,
    }) => {
      test.skip(
        browserName !== 'chromium',
        'CDP input is Chromium-only; physical QA still required',
      )
      const context = await browser.newContext({
        hasTouch: true,
        isMobile: true,
        viewport: { width: 390, height: 844 },
      })
      const page = await context.newPage()
      watchConsole(page)
      if (adapter === 'fallback')
        await page.addInitScript(() => {
          const supports = CSS.supports.bind(CSS)
          CSS.supports = (property: string, value?: string) =>
            property === 'touch-action'
              ? false
              : value === undefined
                ? supports(property)
                : supports(property, value)
        })
      const cdp = await context.newCDPSession(page)
      for (const direction of ['down', 'up', 'horizontal', 'below']) {
        await page.goto(`/qa/?mode=${surface}`)
        if (adapter === 'fallback')
          await page.addStyleTag({
            content: '.ptr-root { touch-action: auto !important; }',
          })
        if (direction === 'below') {
          if (surface === 'page') await page.evaluate(() => scrollTo(0, 40))
          else
            await page.getByTestId('owner').evaluate((node) => {
              node.scrollTop = 40
            })
          await expect(page.getByTestId('qa-root')).toHaveAttribute(
            'data-at-top',
            'false',
          )
        }
        const box = await page.getByTestId('origin').boundingBox()
        if (!box) throw Error('Missing origin')
        const x = box.x + 70,
          y = box.y + 60
        await cdp.send('Input.dispatchTouchEvent', {
          type: 'touchStart',
          touchPoints: [{ x, y }],
        })
        for (let step = 1; step <= 10; step++) {
          await cdp.send('Input.dispatchTouchEvent', {
            type: 'touchMove',
            touchPoints: [
              {
                x: x + (direction === 'horizontal' ? step * 10 : 0),
                y:
                  y +
                  (direction === 'down' || direction === 'below'
                    ? step * 10
                    : direction === 'up'
                      ? -step * 10
                      : 0),
              },
            ],
          })
        }
        if (direction === 'down')
          await expect(page.getByTestId('qa-root')).toHaveAttribute(
            'data-state',
            'armed',
          )
        if (direction === 'up')
          await expect
            .poll(() =>
              surface === 'page'
                ? page.evaluate(() => scrollY)
                : page.getByTestId('owner').evaluate((n) => n.scrollTop),
            )
            .toBeGreaterThan(0)
        await cdp.send('Input.dispatchTouchEvent', {
          type: 'touchEnd',
          touchPoints: [],
        })
        if (direction === 'horizontal' || direction === 'below')
          await expect(page.getByTestId('count')).toHaveText('0')
      }
      await context.close()
    })
  }
}

test('native DOM fallback events preserve pending, axis rejection, cancellation, and exactly-once commit', async ({
  page,
}) => {
  await page.addInitScript(() => {
    CSS.supports = () => false
  })
  await page.goto('/qa/?mode=element')
  const results = await page.getByTestId('origin').evaluate((origin) => {
    const send = (type: string, x: number, y: number, count = 1) => {
      const event = new Event(type, { bubbles: true, cancelable: true })
      const points = Array.from({ length: count }, (_, identifier) => ({
        identifier,
        clientX: x,
        clientY: y,
      }))
      Object.defineProperties(event, {
        touches: { value: type === 'touchend' ? [] : points },
        changedTouches: { value: points },
      })
      origin.dispatchEvent(event)
      return event.defaultPrevented
    }
    return [
      send('touchstart', 20, 20),
      send('touchmove', 20, 22),
      send('touchmove', 20, 120),
      send('touchcancel', 20, 120),
      send('touchmove', 20, 140),
      send('touchstart', 20, 20),
      send('touchmove', 120, 22),
      send('touchmove', 20, 140),
      send('touchstart', 20, 20),
      send('touchmove', 20, 120, 2),
      send('touchstart', 20, 20),
      send('touchmove', 20, 120),
      send('touchend', 20, 120),
      send('touchend', 20, 120),
    ]
  })
  expect(results).toEqual([
    false,
    false,
    true,
    false,
    false,
    false,
    false,
    false,
    false,
    false,
    false,
    true,
    false,
    false,
  ])
  await expect(page.getByTestId('count')).toHaveText('1')
  await expect(page.getByTestId('qa-root')).toHaveAttribute(
    'data-state',
    'idle',
  )
})

test('1000 idle roots create no global touchmove listeners or idle animation frames', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const counts = { globalMoves: 0, raf: 0 }
    Object.assign(window, { qaCounts: counts })
    // eslint-disable-next-line @typescript-eslint/unbound-method -- called below with the original target as this
    const add = EventTarget.prototype.addEventListener
    EventTarget.prototype.addEventListener = function (
      type,
      listener,
      options,
    ) {
      if ((this === window || this === document) && type === 'touchmove')
        counts.globalMoves++
      return add.call(this, type, listener, options)
    }
    const raf = window.requestAnimationFrame.bind(window)
    window.requestAnimationFrame = (callback) => {
      counts.raf++
      return raf(callback)
    }
  })
  await page.goto('/qa/?mode=instances')
  await expect(page.locator('.ptr-root')).toHaveCount(1001)
  const read = () =>
    page.evaluate(
      () =>
        (
          window as unknown as {
            qaCounts: { globalMoves: number; raf: number }
          }
        ).qaCounts,
    )
  const before = await read()
  await page.waitForTimeout(250)
  expect(await read()).toEqual(before)
  expect(before.globalMoves).toBe(0)
  expect(before.raf).toBe(0)
})

test('large list and dynamic non-scrollable auto wrapper retain correct ownership', async ({
  page,
}) => {
  await page.goto('/qa/?mode=large')
  await expect(page.getByTestId('qa-root').locator('p')).toHaveCount(10000)
  await drag(page)
  await expect(page.getByTestId('qa-root')).toHaveAttribute(
    'data-state',
    'armed',
  )
  await page.mouse.up()
  await page.goto('/qa/?mode=auto')
  await page.getByTestId('owner').evaluate((node) => {
    node.scrollTop = 20
  })
  await drag(page)
  await expect(page.getByTestId('qa-root')).toHaveAttribute(
    'data-state',
    'idle',
  )
  await page.mouse.up()
  await page.getByRole('button', { name: 'Grow content' }).click()
  await drag(page)
  await expect(page.getByTestId('qa-root')).toHaveAttribute(
    'data-state',
    'armed',
  )
  await page.mouse.up()
})

for (const threshold of [24, 40, 72, 120]) {
  test(`refresh hold at threshold ${String(threshold)} never translates farther after release`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto(`/qa/?mode=element&threshold=${String(threshold)}`)
    await drag(page, '[data-testid=origin]', threshold)
    const root = page.getByTestId('qa-root')
    const released = await root.evaluate((node) =>
      parseFloat(node.style.getPropertyValue('--ptr-distance')),
    )
    await page.mouse.up()
    await expect(root).toHaveAttribute('data-state', 'refreshing')
    const hold = await root.evaluate((node) =>
      parseFloat(node.style.getPropertyValue('--ptr-distance')),
    )
    expect(hold).toBeLessThanOrEqual(released)
    await expect
      .poll(() =>
        root
          .locator('.ptr-content')
          .evaluate(
            (node) =>
              new DOMMatrixReadOnly(getComputedStyle(node).transform).m42,
          ),
      )
      .toBe(hold)
    await expect(root.locator('.ptr-indicator')).toHaveCSS('opacity', '1')
    await expect(root).toHaveAttribute('data-state', 'idle')
  })
}

test('form controls, links and buttons retain native interaction and focus', async ({
  page,
}) => {
  await page.goto('/qa/?mode=element')
  await page.getByRole('button', { name: 'Tap me' }).click()
  await expect(page.getByText('Tapped', { exact: true })).toBeVisible()
  await page
    .getByRole('textbox', { name: 'Input', exact: true })
    .fill('Editing works')
  await expect(
    page.getByRole('textbox', { name: 'Input', exact: true }),
  ).toBeFocused()
  await page
    .getByRole('textbox', { name: 'Textarea', exact: true })
    .fill('Selection remains native')
  await page.getByRole('combobox').selectOption('Two')
  await page.locator('[contenteditable]').fill('Editable content')
  await expect(page.getByTestId('count')).toHaveText('0')
  await page.getByRole('link', { name: 'Link', exact: true }).click()
  await expect(page).toHaveURL(/#target$/)
})
