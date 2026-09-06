import type { Page } from '@playwright/test'

export function watchConsole(page: Page) {
  page.on('console', (message) => {
    if (['error', 'warning'].includes(message.type()))
      throw Error(message.text())
  })
  page.on('pageerror', (error) => {
    throw error
  })
}
