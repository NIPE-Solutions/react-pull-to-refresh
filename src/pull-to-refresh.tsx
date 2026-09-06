import {
  createContext,
  forwardRef,
  useContext,
  useEffect,
  useRef,
  useState,
  type HTMLAttributes,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type TouchEvent as ReactTouchEvent,
  type ReactNode,
} from 'react'

import {
  classifyIntent,
  getArmedState,
  getPullMetrics,
  type GestureIntent,
} from './mechanics'

import {
  chainAtTop,
  eligibleOrigin,
  resolveScrollTarget,
  type ScrollContainer,
  type ScrollTarget,
} from './scroll-ownership'

export type PullToRefreshState =
  | 'idle'
  | 'pending'
  | 'pulling'
  | 'armed'
  | 'refreshing'
  | 'settling'
  | 'disabled'

export interface PullToRefreshRootProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  disabled?: boolean
  onRefresh: () => void | Promise<void>
  scrollContainer?: ScrollContainer
  threshold?: number
}

export type PullToRefreshIndicatorProps = HTMLAttributes<HTMLDivElement>
export type PullToRefreshContentProps = HTMLAttributes<HTMLDivElement>

interface Session {
  adapter: 'pointer' | 'touch'
  owner: ScrollTarget
  origin: Element
  threshold: number
  distance: number
  cleanup: () => void
  armed: boolean
  intent: GestureIntent
  pointerId: number
  startX: number
  startY: number
}

const DEFAULT_THRESHOLD = 72
const REFRESH_HOLD_DISTANCE = 52
const Context = createContext(false)

function needsTouchFallback() {
  return (
    typeof CSS !== 'undefined' &&
    !CSS.supports('touch-action', 'pan-x pan-down pinch-zoom')
  )
}

const Root = forwardRef<HTMLDivElement, PullToRefreshRootProps>(function Root(
  {
    children,
    disabled = false,
    onRefresh,
    onTouchStart,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    onLostPointerCapture,
    scrollContainer,
    style,
    threshold = DEFAULT_THRESHOLD,
    ...props
  },
  forwardedRef,
) {
  const rootRef = useRef<HTMLDivElement | null>(null)
  const sessionRef = useRef<Session | null>(null)
  const mountedRef = useRef(true)
  const refreshingRef = useRef(false)
  const [state, setState] = useState<PullToRefreshState>(
    disabled ? 'disabled' : 'idle',
  )

  const handlersRef = useRef({ move, finish })

  function setRoot(node: HTMLDivElement | null) {
    rootRef.current = node
    // Publish handlers during commit, not during a speculative render.
    if (node) handlersRef.current = { move, finish }
    if (typeof forwardedRef === 'function') forwardedRef(node)
    else if (forwardedRef) forwardedRef.current = node
  }

  function setDistance(distance: number, progress: number, overshoot: number) {
    const root = rootRef.current
    if (!root) return
    root.style.setProperty('--ptr-distance', String(distance) + 'px')
    root.style.setProperty('--ptr-progress', String(progress))
    root.style.setProperty('--ptr-overshoot', String(overshoot) + 'px')
  }

  function clearSession() {
    const session = sessionRef.current
    sessionRef.current = null
    session?.cleanup()
    return session
  }

  function listen<T extends keyof HTMLElementEventMap>(
    target: HTMLElement | Window,
    type: T,
    listener: (event: HTMLElementEventMap[T]) => void,
    passive = true,
  ) {
    const session = sessionRef.current
    if (!session) return
    const cleanup = session.cleanup
    target.addEventListener(type, listener as EventListener, { passive })
    session.cleanup = () => {
      target.removeEventListener(type, listener as EventListener)
      cleanup()
    }
  }

  function settle() {
    clearSession()
    setDistance(0, 0, 0)
    setState('settling')
  }

  function commitRefresh(session: Session) {
    if (refreshingRef.current) return
    refreshingRef.current = true
    sessionRef.current = null
    setDistance(
      Math.min(REFRESH_HOLD_DISTANCE, session.threshold, session.distance),
      1,
      0,
    )
    setState('refreshing')

    const complete = () => {
      refreshingRef.current = false
      if (mountedRef.current) settle()
    }
    let result: void | Promise<void>
    try {
      result = onRefresh()
    } catch {
      complete()
      return
    }
    void Promise.resolve(result).then(complete, complete)
  }

  function finish(cancelled: boolean) {
    const session = clearSession()
    if (!session) return
    if (!cancelled && session.intent === 'pull' && session.armed)
      commitRefresh(session)
    else if (session.intent === 'pull') settle()
    else setState(disabled ? 'disabled' : 'idle')
  }

  function begin(
    target: EventTarget | null,
    id: number,
    x: number,
    y: number,
    adapter: Session['adapter'],
  ) {
    if (sessionRef.current) {
      finish(true)
      return false
    }
    const root = rootRef.current
    if (!root || disabled || refreshingRef.current) return false
    const origin = eligibleOrigin(root, target)
    const owner = resolveScrollTarget(root, scrollContainer)
    if (!origin || !owner || !chainAtTop(root, origin, owner)) return false
    sessionRef.current = {
      adapter,
      owner,
      origin,
      threshold,
      distance: 0,
      armed: false,
      intent: 'pending',
      pointerId: id,
      startX: x,
      startY: y,
      cleanup: () => {},
    }
    listen(window, 'blur', () => handlersRef.current.finish(true))
    setState('pending')
    return true
  }

  function move(
    x: number,
    y: number,
    event: {
      defaultPrevented: boolean
      cancelable: boolean
      preventDefault(): void
    },
  ) {
    const session = sessionRef.current
    const root = rootRef.current
    if (!session || !root) return
    if (disabled || event.defaultPrevented || !event.cancelable) {
      finish(true)
      return
    }
    const deltaX = x - session.startX,
      deltaY = y - session.startY
    if (session.intent === 'pending') {
      session.intent = classifyIntent(deltaX, deltaY)
      if (session.intent === 'reject') {
        finish(true)
        return
      }
      if (session.intent === 'pull') {
        if (
          resolveScrollTarget(root, scrollContainer) !== session.owner ||
          !chainAtTop(root, session.origin, session.owner)
        ) {
          session.intent = 'reject'
          finish(true)
          return
        }
        if (session.adapter === 'pointer')
          root.setPointerCapture(session.pointerId)
      }
    }
    if (session.intent !== 'pull') return
    event.preventDefault()
    const metrics = getPullMetrics(deltaY, session.threshold)
    session.distance = metrics.distance
    session.armed = getArmedState(
      session.armed,
      metrics.distance,
      session.threshold,
    )
    setDistance(metrics.distance, metrics.progress, metrics.overshoot)
    setState(session.armed ? 'armed' : 'pulling')
  }

  function finishNative(event: PointerEvent | TouchEvent) {
    if (
      'pointerId' in event &&
      event.pointerId !== sessionRef.current?.pointerId
    )
      return
    handlersRef.current.finish(event.type.endsWith('cancel'))
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    onPointerDown?.(event)
    if (event.pointerType === 'touch' && needsTouchFallback()) return
    if (sessionRef.current && !event.isPrimary) {
      finish(true)
      return
    }
    if (
      event.defaultPrevented ||
      !event.isPrimary ||
      (event.pointerType === 'mouse' && event.button !== 0)
    )
      return
    if (
      !begin(
        event.target,
        event.pointerId,
        event.clientX,
        event.clientY,
        'pointer',
      )
    )
      return
    const root = event.currentTarget
    const session = sessionRef.current
    if (!session) return
    const cleanup = session.cleanup
    session.cleanup = () => {
      cleanup()
      if (root.hasPointerCapture(event.pointerId))
        root.releasePointerCapture(event.pointerId)
    }
    listen(window, 'pointerup', finishNative)
    listen(window, 'pointercancel', finishNative)
    listen(window, 'pointerdown', (e) => {
      if (e.pointerId !== event.pointerId) handlersRef.current.finish(true)
    })
  }

  function handleTouchStart(event: ReactTouchEvent<HTMLDivElement>) {
    onTouchStart?.(event)
    if (!needsTouchFallback()) return
    if (event.touches.length !== 1) {
      finish(true)
      return
    }
    const touch = event.touches[0]
    if (!touch) return
    if (
      event.defaultPrevented ||
      !begin(
        event.target,
        touch.identifier,
        touch.clientX,
        touch.clientY,
        'touch',
      )
    )
      return
    const root = event.currentTarget
    listen(
      root,
      'touchmove',
      (e) => {
        const point = e.touches[0]
        if (e.touches.length !== 1 || point?.identifier !== touch.identifier) {
          handlersRef.current.finish(true)
          return
        }
        handlersRef.current.move(point.clientX, point.clientY, e)
      },
      false,
    )
    listen(root, 'touchend', finishNative)
    listen(root, 'touchcancel', finishNative)
    listen(window, 'touchstart', (e) => {
      if (e.touches.length !== 1) handlersRef.current.finish(true)
    })
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    onPointerMove?.(event)
    if (
      sessionRef.current?.adapter === 'pointer' &&
      sessionRef.current.pointerId === event.pointerId
    )
      move(event.clientX, event.clientY, event)
  }

  function finishPointer(
    event: ReactPointerEvent<HTMLDivElement>,
    cancelled: boolean,
  ) {
    if (
      sessionRef.current?.adapter === 'pointer' &&
      event.pointerId === sessionRef.current.pointerId
    )
      finish(cancelled)
  }

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      clearSession()
    }
  }, [])

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const target = resolveScrollTarget(root, scrollContainer)
    const updateBoundary = () => {
      const current = resolveScrollTarget(root, scrollContainer)
      root.dataset.atTop = String(chainAtTop(root, root, current))
    }
    updateBoundary()
    target?.addEventListener('scroll', updateBoundary, { passive: true })
    root.addEventListener('scroll', updateBoundary, true)
    return () => {
      target?.removeEventListener('scroll', updateBoundary)
      root.removeEventListener('scroll', updateBoundary, true)
    }
  })

  useEffect(() => {
    if (disabled && !refreshingRef.current) {
      clearSession()
      setDistance(0, 0, 0)
      setState('disabled')
    } else if (!disabled && state === 'disabled') {
      setState('idle')
    }
  }, [disabled, state])

  useEffect(() => {
    if (state !== 'settling') return
    const reduced =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const timer = window.setTimeout(
      () => {
        if (mountedRef.current && !disabled) setState('idle')
      },
      reduced ? 0 : 220,
    )
    return () => window.clearTimeout(timer)
  }, [disabled, state])

  if (!Number.isFinite(threshold) || threshold <= 0) {
    throw new Error(
      'PullToRefresh threshold must be finite and greater than zero',
    )
  }

  return (
    <Context.Provider value>
      <div
        {...props}
        ref={setRoot}
        className={['ptr-root', props.className].filter(Boolean).join(' ')}
        data-disabled={disabled ? '' : undefined}
        data-state={disabled && state !== 'refreshing' ? 'disabled' : state}
        onLostPointerCapture={(event) => {
          onLostPointerCapture?.(event)
          if (event.target === event.currentTarget) finishPointer(event, true)
        }}
        onPointerCancel={(event) => {
          onPointerCancel?.(event)
          finishPointer(event, true)
        }}
        onTouchStart={handleTouchStart}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={(event) => {
          onPointerUp?.(event)
          finishPointer(event, false)
        }}
        style={
          {
            '--ptr-distance': '0px',
            '--ptr-progress': 0,
            '--ptr-overshoot': '0px',
            '--ptr-threshold': String(threshold) + 'px',
            ...style,
          } as CSSProperties
        }
      >
        {children}
      </div>
    </Context.Provider>
  )
})

function useInsideRoot(name: string) {
  const inside = useContext(Context)
  if (!inside) {
    throw new Error(
      `PullToRefresh.${name} must be used inside PullToRefresh.Root`,
    )
  }
}

const Indicator = forwardRef<HTMLDivElement, PullToRefreshIndicatorProps>(
  function Indicator({ className, ...props }, ref) {
    useInsideRoot('Indicator')
    return (
      <div
        {...props}
        ref={ref}
        aria-hidden="true"
        className={['ptr-indicator', className].filter(Boolean).join(' ')}
      />
    )
  },
)

const Content = forwardRef<HTMLDivElement, PullToRefreshContentProps>(
  function Content({ className, ...props }, ref) {
    useInsideRoot('Content')
    return (
      <div
        {...props}
        ref={ref}
        className={['ptr-content', className].filter(Boolean).join(' ')}
      />
    )
  },
)

export const PullToRefresh = { Root, Indicator, Content }
