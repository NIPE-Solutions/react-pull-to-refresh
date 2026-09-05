import { act, fireEvent, render, screen } from '@testing-library/react'
import { StrictMode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { PullToRefresh } from '../src'

function deferred() {
  let resolve!: () => void
  const promise = new Promise<void>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

function renderFixture(
  onRefresh: () => void | Promise<void>,
  props: { disabled?: boolean } = {},
) {
  return render(
    <StrictMode>
      <PullToRefresh.Root onRefresh={onRefresh} {...props} data-testid="root">
        <PullToRefresh.Indicator data-testid="indicator">
          Refresh status
        </PullToRefresh.Indicator>
        <PullToRefresh.Content data-testid="content">
          Feed
        </PullToRefresh.Content>
      </PullToRefresh.Root>
    </StrictMode>,
  )
}

function pull(distance: number) {
  const root = screen.getByTestId('root')
  fireEvent.pointerDown(root, {
    pointerId: 1,
    pointerType: 'touch',
    isPrimary: true,
    clientX: 20,
    clientY: 20,
    button: 0,
  })
  fireEvent.pointerMove(root, {
    pointerId: 1,
    pointerType: 'touch',
    isPrimary: true,
    clientX: 21,
    clientY: 20 + distance,
  })
}

describe('PullToRefresh', () => {
  it('renders a minimal deterministic compound-component structure', () => {
    renderFixture(() => undefined)

    expect(screen.getByTestId('root')).toHaveAttribute('data-state', 'idle')
    expect(screen.getByTestId('indicator')).toHaveAttribute(
      'aria-hidden',
      'true',
    )
    expect(screen.getByTestId('content')).toHaveTextContent('Feed')
  })

  it('commits an armed pull exactly once and stays refreshing for its promise', async () => {
    const pending = deferred()
    const onRefresh = vi.fn(() => pending.promise)
    renderFixture(onRefresh)

    pull(90)
    expect(screen.getByTestId('root')).toHaveAttribute('data-state', 'armed')
    fireEvent.pointerUp(screen.getByTestId('root'), { pointerId: 1 })
    fireEvent.pointerCancel(screen.getByTestId('root'), { pointerId: 1 })

    expect(onRefresh).toHaveBeenCalledTimes(1)
    expect(screen.getByTestId('root')).toHaveAttribute(
      'data-state',
      'refreshing',
    )

    await act(async () => {
      pending.resolve()
      await pending.promise
    })
    expect(screen.getByTestId('root')).toHaveAttribute('data-state', 'settling')
  })

  it('does not refresh when a pull reverses below hysteresis before release', () => {
    const onRefresh = vi.fn()
    renderFixture(onRefresh)

    pull(90)
    fireEvent.pointerMove(screen.getByTestId('root'), {
      pointerId: 1,
      pointerType: 'touch',
      isPrimary: true,
      clientX: 21,
      clientY: 70,
    })
    fireEvent.pointerUp(screen.getByTestId('root'), { pointerId: 1 })

    expect(onRefresh).not.toHaveBeenCalled()
    expect(screen.getByTestId('root')).toHaveAttribute('data-state', 'settling')
  })

  it('does not claim horizontal movement', () => {
    const onRefresh = vi.fn()
    renderFixture(onRefresh)
    const root = screen.getByTestId('root')

    fireEvent.pointerDown(root, {
      pointerId: 3,
      pointerType: 'touch',
      isPrimary: true,
      clientX: 10,
      clientY: 10,
      button: 0,
    })
    fireEvent.pointerMove(root, {
      pointerId: 3,
      pointerType: 'touch',
      isPrimary: true,
      clientX: 50,
      clientY: 18,
    })
    fireEvent.pointerUp(root, { pointerId: 3 })

    expect(onRefresh).not.toHaveBeenCalled()
    expect(root).toHaveAttribute('data-state', 'idle')
  })

  it('leaves gestures and scrolling untouched while disabled', () => {
    const onRefresh = vi.fn()
    renderFixture(onRefresh, { disabled: true })

    pull(100)
    fireEvent.pointerUp(screen.getByTestId('root'), { pointerId: 1 })

    expect(onRefresh).not.toHaveBeenCalled()
    expect(screen.getByTestId('root')).toHaveAttribute('data-state', 'disabled')
  })

  it('does not activate when its scroll container is away from the top', () => {
    const onRefresh = vi.fn()
    renderFixture(onRefresh)
    const root = screen.getByTestId('root')
    Object.defineProperty(root, 'scrollTop', { configurable: true, value: 40 })

    pull(100)
    fireEvent.pointerUp(root, { pointerId: 1 })

    expect(onRefresh).not.toHaveBeenCalled()
    expect(root).toHaveAttribute('data-state', 'idle')
  })
})
