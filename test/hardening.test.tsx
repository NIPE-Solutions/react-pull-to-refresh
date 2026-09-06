import { act, fireEvent, render, screen } from '@testing-library/react'
import { StrictMode, type ComponentProps } from 'react'
import { afterEach, expect, it, vi } from 'vitest'
import { PullToRefresh } from '../src'
import { getArmedState } from '../src/mechanics'

afterEach(() => vi.unstubAllGlobals())
function fixture(
  props: Partial<ComponentProps<typeof PullToRefresh.Root>> = {},
) {
  return render(
    <StrictMode>
      <PullToRefresh.Root
        onRefresh={() => new Promise(() => {})}
        {...props}
        data-testid="root"
      >
        <PullToRefresh.Content>
          {props.children ?? 'Feed'}
        </PullToRefresh.Content>
      </PullToRefresh.Root>
    </StrictMode>,
  )
}
function pointer(node: Element, type: string, y: number, x = 20) {
  return fireEvent(
    node,
    new PointerEvent(type, {
      bubbles: true,
      cancelable: true,
      pointerId: 1,
      pointerType: 'mouse',
      isPrimary: true,
      clientX: x,
      clientY: y,
    }),
  )
}
function scrollable(node: HTMLElement, top = 0, height = 400) {
  node.style.overflowY = 'auto'
  Object.defineProperties(node, {
    scrollHeight: { configurable: true, value: height },
    clientHeight: { configurable: true, value: 100 },
  })
  node.scrollTop = top
}
it.each([NaN, Infinity, -1, 0])('rejects invalid threshold %s', (threshold) => {
  expect(() => fixture({ threshold })).toThrow(/threshold/)
})
it.each([4, 24, 72, 120])('disarms coherently at threshold %s', (threshold) => {
  expect(getArmedState(false, threshold, threshold)).toBe(true)
  expect(
    getArmedState(true, threshold - Math.min(6, threshold / 4) / 2, threshold),
  ).toBe(true)
  expect(getArmedState(true, threshold / 2, threshold)).toBe(false)
})
it.each([24, 40, 72, 120])(
  'hold never increases released distance at threshold %s',
  (threshold) => {
    fixture({ threshold })
    const root = screen.getByTestId('root')
    pointer(root, 'pointerdown', 20)
    pointer(root, 'pointermove', 20 + threshold)
    pointer(
      root,
      'pointermove',
      20 + threshold - Math.min(6, threshold / 4) / 2,
    )
    const released = parseFloat(root.style.getPropertyValue('--ptr-distance'))
    pointer(root, 'pointerup', 20 + threshold)
    expect(root).toHaveAttribute('data-state', 'refreshing')
    expect(
      parseFloat(root.style.getPropertyValue('--ptr-distance')),
    ).toBeLessThanOrEqual(released)
  },
)
it.each(['reject', 'throw'])(
  'settles consumer %s without console noise',
  async (mode) => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const refresh = vi.fn(() => {
      if (mode === 'throw') throw Error('consumer')
      return Promise.reject(Error('consumer'))
    })
    fixture({ onRefresh: refresh })
    const root = screen.getByTestId('root')
    pointer(root, 'pointerdown', 20)
    pointer(root, 'pointermove', 110)
    pointer(root, 'pointerup', 110)
    await act(async () => {})
    expect(root).toHaveAttribute('data-state', 'settling')
    expect(refresh).toHaveBeenCalledOnce()
    expect(error).not.toHaveBeenCalled()
    error.mockRestore()
  },
)
it('keeps explicit null refs unresolved and resolves them at the next gesture', () => {
  const ref = { current: null as HTMLElement | null }
  fixture({ scrollContainer: ref })
  const root = screen.getByTestId('root')
  pointer(root, 'pointerdown', 20)
  pointer(root, 'pointermove', 110)
  expect(root).toHaveAttribute('data-state', 'idle')
  ref.current = root
  pointer(root, 'pointerdown', 20)
  pointer(root, 'pointermove', 110)
  expect(root).toHaveAttribute('data-state', 'armed')
})
it('skips empty overflow auto ancestors and resolves dynamic content at start', () => {
  const view = render(
    <div data-testid="outer">
      <div data-testid="empty">
        <PullToRefresh.Root onRefresh={() => {}} data-testid="root">
          Feed
        </PullToRefresh.Root>
      </div>
    </div>,
  )
  const outer = screen.getByTestId('outer'),
    empty = screen.getByTestId('empty'),
    root = screen.getByTestId('root')
  scrollable(outer, 30)
  scrollable(empty, 0, 100)
  pointer(root, 'pointerdown', 20)
  pointer(root, 'pointermove', 110)
  expect(root).toHaveAttribute('data-state', 'idle')
  scrollable(empty, 0, 400)
  pointer(root, 'pointerdown', 20)
  pointer(root, 'pointermove', 110)
  expect(root).toHaveAttribute('data-state', 'armed')
  view.unmount()
})
it.each([0, 30])('checks all nested scrollers with inner offset %s', (top) => {
  fixture({
    children: (
      <div data-testid="inner">
        <div data-testid="origin">Comments</div>
      </div>
    ),
  })
  const root = screen.getByTestId('root'),
    inner = screen.getByTestId('inner'),
    origin = screen.getByTestId('origin')
  scrollable(inner, top)
  pointer(origin, 'pointerdown', 20)
  pointer(origin, 'pointermove', 110)
  expect(root).toHaveAttribute('data-state', top ? 'idle' : 'armed')
})
it.each(['input', 'textarea', 'select', 'editable', 'ignore'])(
  'does not claim %s origins',
  (kind) => {
    fixture({
      children:
        kind === 'input' ? (
          <input />
        ) : kind === 'textarea' ? (
          <textarea />
        ) : kind === 'select' ? (
          <select />
        ) : (
          <div
            {...(kind === 'editable'
              ? { contentEditable: true }
              : { 'data-pull-to-refresh-ignore': '' })}
          >
            <span>Origin</span>
          </div>
        ),
    })
    const root = screen.getByTestId('root'),
      origin = root.querySelector('input,textarea,select,span')
    if (!origin) throw Error('Missing origin')
    pointer(origin, 'pointerdown', 20)
    pointer(origin, 'pointermove', 110)
    expect(root).toHaveAttribute('data-state', 'idle')
  },
)
function touch(
  node: Element,
  type: string,
  y: number,
  count = 1,
  cancelable = true,
  x = 20,
) {
  const points = Array.from({ length: count }, (_, identifier) => ({
    identifier,
    clientX: x,
    clientY: y,
    target: node,
  }))
  const event = new Event(type, { bubbles: true, cancelable })
  Object.defineProperties(event, {
    touches: { value: type === 'touchend' ? [] : points },
    changedTouches: { value: points },
  })
  fireEvent(node, event)
  return event.defaultPrevented
}
it('touch fallback only prevents after claim and cleans up on cancel', () => {
  vi.stubGlobal('CSS', { supports: () => false })
  fixture()
  const root = screen.getByTestId('root')
  expect(touch(root, 'touchstart', 20)).toBe(false)
  expect(root).toHaveAttribute('data-state', 'pending')
  expect(touch(root, 'touchmove', 22)).toBe(false)
  expect(touch(root, 'touchmove', 100)).toBe(true)
  expect(root).toHaveAttribute('data-state', 'armed')
  touch(root, 'touchcancel', 100)
  expect(root).toHaveAttribute('data-state', 'settling')
  expect(touch(root, 'touchmove', 110)).toBe(false)
})
it.each(['up', 'horizontal', 'multi', 'uncancelable'])(
  'fallback abandons %s without preventing browser handling',
  (kind) => {
    vi.stubGlobal('CSS', { supports: () => false })
    fixture()
    const root = screen.getByTestId('root')
    touch(root, 'touchstart', 20)
    expect(
      touch(
        root,
        'touchmove',
        kind === 'up' ? 0 : 100,
        kind === 'multi' ? 2 : 1,
        kind !== 'uncancelable',
        kind === 'horizontal' ? 200 : 20,
      ),
    ).toBe(false)
    expect(root).toHaveAttribute('data-state', 'idle')
    expect(touch(root, 'touchmove', 150)).toBe(false)
  },
)

it('ignores bubbled lost capture when implicit child capture transfers to root', () => {
  fixture({ children: <span data-testid="origin">Origin</span> })
  const root = screen.getByTestId('root'),
    origin = screen.getByTestId('origin')
  pointer(origin, 'pointerdown', 20)
  pointer(origin, 'pointermove', 50)
  fireEvent.lostPointerCapture(origin, { pointerId: 1 })
  expect(root).toHaveAttribute('data-state', 'pulling')
  fireEvent.lostPointerCapture(root, { pointerId: 1 })
  expect(root).toHaveAttribute('data-state', 'settling')
})

it('fallback commits once despite compatibility pointer cancel and rerender, then settles disabled', async () => {
  vi.stubGlobal('CSS', { supports: () => false })
  let resolve: (() => void) | undefined
  const refresh = vi.fn(
    () =>
      new Promise<void>((done) => {
        resolve = done
      }),
  )
  const view = fixture({ onRefresh: refresh })
  const root = screen.getByTestId('root')
  touch(root, 'touchstart', 20)
  fireEvent.pointerDown(root, {
    pointerId: 1,
    pointerType: 'touch',
    isPrimary: true,
  })
  touch(root, 'touchmove', 120)
  fireEvent.pointerCancel(root, { pointerId: 1, pointerType: 'touch' })
  expect(root).toHaveAttribute('data-state', 'armed')
  touch(root, 'touchend', 120)
  touch(root, 'touchend', 120)
  view.rerender(
    <StrictMode>
      <PullToRefresh.Root onRefresh={refresh} disabled data-testid="root">
        Feed
      </PullToRefresh.Root>
    </StrictMode>,
  )
  expect(root).toHaveAttribute('data-state', 'refreshing')
  expect(refresh).toHaveBeenCalledOnce()
  await act(async () => {
    resolve?.()
    await Promise.resolve()
  })
  expect(root).toHaveAttribute('data-state', 'disabled')
  expect(touch(root, 'touchmove', 150)).toBe(false)
})
it.each(['touchcancel', 'blur', 'unmount', 'additional'])(
  'removes fallback listeners on %s',
  (reason) => {
    vi.stubGlobal('CSS', { supports: () => false })
    const view = fixture()
    const root = screen.getByTestId('root')
    touch(root, 'touchstart', 20)
    touch(root, 'touchmove', 90)
    if (reason === 'unmount') view.unmount()
    else if (reason === 'blur') fireEvent(window, new Event('blur'))
    else if (reason === 'additional') touch(document.body, 'touchstart', 20, 2)
    else touch(root, 'touchcancel', 90)
    expect(touch(root, 'touchmove', 140)).toBe(false)
  },
)
it('rechecks a nested boundary and never takes over a browser-owned gesture at mid-scroll', () => {
  fixture({ children: <div data-testid="inner">Inner</div> })
  const root = screen.getByTestId('root'),
    inner = screen.getByTestId('inner')
  scrollable(inner)
  pointer(inner, 'pointerdown', 20)
  inner.scrollTop = 20
  pointer(inner, 'pointermove', 100)
  expect(root).toHaveAttribute('data-state', 'idle')
  pointer(inner, 'pointerdown', 20)
  inner.scrollTop = 0
  pointer(inner, 'pointermove', 100)
  expect(root).toHaveAttribute('data-state', 'idle')
  pointer(inner, 'pointerdown', 20)
  pointer(inner, 'pointermove', 100)
  expect(root).toHaveAttribute('data-state', 'armed')
})
it('checks intermediate nested consumers and skips a non-scrollable descendant', () => {
  fixture({
    children: (
      <div data-testid="middle">
        <div data-testid="inner">Inner</div>
      </div>
    ),
  })
  const root = screen.getByTestId('root'),
    middle = screen.getByTestId('middle'),
    inner = screen.getByTestId('inner')
  scrollable(middle, 20)
  scrollable(inner)
  pointer(inner, 'pointerdown', 20)
  pointer(inner, 'pointermove', 100)
  expect(root).toHaveAttribute('data-state', 'idle')
  middle.scrollTop = 0
  scrollable(inner, 20, 100)
  pointer(inner, 'pointerdown', 20)
  pointer(inner, 'pointermove', 100)
  expect(root).toHaveAttribute('data-state', 'armed')
})
it('keeps session threshold and CSS progress stable through parent rerenders', () => {
  const refresh = () => new Promise<void>(() => {})
  const view = fixture({ threshold: 24, onRefresh: refresh })
  const root = screen.getByTestId('root')
  pointer(root, 'pointerdown', 20)
  pointer(root, 'pointermove', 44)
  const distance = root.style.getPropertyValue('--ptr-distance')
  view.rerender(
    <StrictMode>
      <PullToRefresh.Root
        onRefresh={refresh}
        threshold={120}
        data-testid="root"
      >
        Feed
      </PullToRefresh.Root>
    </StrictMode>,
  )
  expect(root.style.getPropertyValue('--ptr-distance')).toBe(distance)
  expect(root.style.getPropertyValue('--ptr-progress')).toBe('1')
  pointer(root, 'pointermove', 45)
  pointer(root, 'pointerup', 45)
  expect(root).toHaveAttribute('data-state', 'refreshing')
  expect(
    parseFloat(root.style.getPropertyValue('--ptr-distance')),
  ).toBeLessThanOrEqual(24)
})
it.each(['button', 'a'])('preserves a normal %s tap and focus', (tag) => {
  const click = vi.fn()
  fixture({
    children:
      tag === 'button' ? (
        <button onClick={click}>Tap</button>
      ) : (
        <a href="#" onClick={click}>
          Tap
        </a>
      ),
  })
  const child = screen.getByText('Tap')
  child.focus()
  expect(pointer(child, 'pointerdown', 20)).toBe(true)
  expect(pointer(child, 'pointermove', 22)).toBe(true)
  pointer(child, 'pointerup', 22)
  fireEvent.click(child)
  expect(click).toHaveBeenCalledOnce()
  expect(child).toHaveFocus()
})
it('reduced motion settles on the lifecycle timer without transition events', async () => {
  vi.useFakeTimers()
  vi.stubGlobal('matchMedia', () => ({ matches: true }))
  fixture({ onRefresh: () => {} })
  const root = screen.getByTestId('root')
  pointer(root, 'pointerdown', 20)
  pointer(root, 'pointermove', 120)
  pointer(root, 'pointerup', 120)
  expect(root).toHaveAttribute('data-state', 'refreshing')
  await act(async () => {})
  await act(async () => {
    await vi.runAllTimersAsync()
  })
  expect(root).toHaveAttribute('data-state', 'idle')
  vi.useRealTimers()
})

it('does not skip a scrolling Root when an explicit outer owner is supplied', () => {
  fixture({ scrollContainer: window })
  const root = screen.getByTestId('root')
  scrollable(root, 30)
  pointer(root, 'pointerdown', 20)
  pointer(root, 'pointermove', 120)
  expect(root).toHaveAttribute('data-state', 'idle')
})

it('checks scroll consumers between Root and an explicit ancestor owner', () => {
  render(
    <div data-testid="outer">
      <PullToRefresh.Root
        onRefresh={() => {}}
        scrollContainer={window}
        data-testid="root"
      >
        Feed
      </PullToRefresh.Root>
    </div>,
  )
  const outer = screen.getByTestId('outer'),
    root = screen.getByTestId('root')
  scrollable(outer, 30)
  pointer(root, 'pointerdown', 20)
  pointer(root, 'pointermove', 120)
  expect(root).toHaveAttribute('data-state', 'idle')
})

it('abandons fallback when scrollContainer prop changes before claim', () => {
  vi.stubGlobal('CSS', { supports: () => false })
  const owner = document.createElement('div')
  const view = fixture({ scrollContainer: window })
  const root = screen.getByTestId('root')
  touch(root, 'touchstart', 20)
  view.rerender(
    <StrictMode>
      <PullToRefresh.Root
        onRefresh={() => {}}
        scrollContainer={owner}
        data-testid="root"
      >
        Feed
      </PullToRefresh.Root>
    </StrictMode>,
  )
  expect(touch(root, 'touchmove', 120)).toBe(false)
  expect(root).toHaveAttribute('data-state', 'idle')
})
it.each(['touch', 'outside-pointer'])(
  'uses current refresh callback on %s release after rerender',
  (adapter) => {
    vi.stubGlobal('CSS', { supports: () => false })
    const oldRefresh = vi.fn(),
      newRefresh = vi.fn()
    const view = fixture({ onRefresh: oldRefresh })
    const root = screen.getByTestId('root')
    if (adapter === 'touch') {
      touch(root, 'touchstart', 20)
      touch(root, 'touchmove', 120)
    } else {
      pointer(root, 'pointerdown', 20)
      pointer(root, 'pointermove', 120)
    }
    view.rerender(
      <StrictMode>
        <PullToRefresh.Root onRefresh={newRefresh} data-testid="root">
          Feed
        </PullToRefresh.Root>
      </StrictMode>,
    )
    if (adapter === 'touch') touch(root, 'touchend', 120)
    else fireEvent.pointerUp(window, { pointerId: 1 })
    expect(oldRefresh).not.toHaveBeenCalled()
    expect(newRefresh).toHaveBeenCalledOnce()
  },
)
