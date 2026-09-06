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

  it('captures the pointer only after downward intent is established', () => {
    renderFixture(() => undefined)
    const root = screen.getByTestId('root')
    const setPointerCapture = vi.spyOn(root, 'setPointerCapture')

    fireEvent.pointerDown(root, {
      pointerId: 7,
      pointerType: 'touch',
      isPrimary: true,
      clientX: 20,
      clientY: 20,
      button: 0,
    })
    expect(setPointerCapture).not.toHaveBeenCalled()

    fireEvent.pointerMove(root, {
      pointerId: 7,
      pointerType: 'touch',
      isPrimary: true,
      clientX: 21,
      clientY: 34,
    })
    expect(setPointerCapture).toHaveBeenCalledOnce()
    expect(setPointerCapture).toHaveBeenCalledWith(7)
  })

  it('rechecks the scroll boundary before claiming a pending gesture', () => {
    const onRefresh = vi.fn()
    renderFixture(onRefresh)
    const root = screen.getByTestId('root')
    root.style.overflowY = 'auto'
    Object.defineProperties(root, {
      scrollHeight: { value: 400 },
      clientHeight: { value: 100 },
    })
    let scrollTop = 0
    Object.defineProperty(root, 'scrollTop', {
      configurable: true,
      get: () => scrollTop,
    })

    fireEvent.pointerDown(root, {
      pointerId: 8,
      pointerType: 'touch',
      isPrimary: true,
      clientX: 20,
      clientY: 20,
      button: 0,
    })
    scrollTop = 12
    fireEvent.pointerMove(root, {
      pointerId: 8,
      pointerType: 'touch',
      isPrimary: true,
      clientX: 20,
      clientY: 40,
    })
    fireEvent.pointerUp(root, { pointerId: 8 })

    expect(onRefresh).not.toHaveBeenCalled()
    expect(root).toHaveAttribute('data-state', 'idle')
    expect(root).toHaveStyle({ '--ptr-distance': '0px' })
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
    root.style.overflowY = 'auto'
    Object.defineProperties(root, {
      scrollHeight: { value: 400 },
      clientHeight: { value: 100 },
    })
    Object.defineProperty(root, 'scrollTop', { configurable: true, value: 40 })

    pull(100)
    fireEvent.pointerUp(root, { pointerId: 1 })

    expect(onRefresh).not.toHaveBeenCalled()
    expect(root).toHaveAttribute('data-state', 'idle')
  })

  it('abandons a session on a second non-primary pointer', () => {
    const onRefresh = vi.fn()
    renderFixture(onRefresh)
    const root = screen.getByTestId('root')

    fireEvent.pointerDown(root, {
      pointerId: 1,
      pointerType: 'touch',
      isPrimary: true,
      clientX: 20,
      clientY: 20,
      button: 0,
    })
    fireEvent.pointerDown(root, {
      pointerId: 2,
      pointerType: 'touch',
      isPrimary: false,
      clientX: 30,
      clientY: 30,
      button: 0,
    })
    fireEvent.pointerMove(root, {
      pointerId: 2,
      pointerType: 'touch',
      isPrimary: false,
      clientX: 30,
      clientY: 130,
    })
    fireEvent.pointerUp(root, { pointerId: 2 })

    expect(onRefresh).not.toHaveBeenCalled()
    expect(root).toHaveAttribute('data-state', 'idle')
  })

  it('cancels an uncommitted pointer without refreshing', () => {
    const onRefresh = vi.fn()
    renderFixture(onRefresh)
    const root = screen.getByTestId('root')

    pull(90)
    expect(root).toHaveAttribute('data-state', 'armed')
    fireEvent.pointerCancel(root, { pointerId: 1 })

    expect(onRefresh).not.toHaveBeenCalled()
    expect(root).toHaveAttribute('data-state', 'settling')
    expect(root).toHaveStyle({ '--ptr-distance': '0px' })
  })

  it('ignores repeated pulls while a refresh is pending', () => {
    const pending = deferred()
    const onRefresh = vi.fn(() => pending.promise)
    renderFixture(onRefresh)
    const root = screen.getByTestId('root')

    pull(90)
    fireEvent.pointerUp(root, { pointerId: 1 })
    pull(100)
    fireEvent.pointerUp(root, { pointerId: 1 })

    expect(onRefresh).toHaveBeenCalledOnce()
    expect(root).toHaveAttribute('data-state', 'refreshing')
  })

  it('cancels safely when disabled changes during a pull', () => {
    const onRefresh = vi.fn()
    const view = renderFixture(onRefresh)
    pull(44)

    view.rerender(
      <StrictMode>
        <PullToRefresh.Root onRefresh={onRefresh} disabled data-testid="root">
          <PullToRefresh.Indicator>Refresh status</PullToRefresh.Indicator>
          <PullToRefresh.Content>Feed</PullToRefresh.Content>
        </PullToRefresh.Root>
      </StrictMode>,
    )

    const root = screen.getByTestId('root')
    expect(onRefresh).not.toHaveBeenCalled()
    expect(root).toHaveAttribute('data-state', 'disabled')
    expect(root).toHaveStyle({ '--ptr-distance': '0px' })
  })

  it('does not update state after unmounting during refresh', async () => {
    const pending = deferred()
    const onRefresh = vi.fn(() => pending.promise)
    const view = renderFixture(onRefresh)

    pull(90)
    fireEvent.pointerUp(screen.getByTestId('root'), { pointerId: 1 })
    view.unmount()

    await act(async () => {
      pending.resolve()
      await pending.promise
    })
    expect(onRefresh).toHaveBeenCalledOnce()
  })
})
