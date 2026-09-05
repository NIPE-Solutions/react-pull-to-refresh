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
  type ReactNode,
  type RefObject,
} from 'react'

import {
  classifyIntent,
  getArmedState,
  getPullMetrics,
  isAtScrollStart,
  type GestureIntent,
} from './mechanics'

export type PullToRefreshState =
  | 'idle'
  | 'pending'
  | 'pulling'
  | 'armed'
  | 'refreshing'
  | 'settling'
  | 'disabled'

type ScrollTarget = HTMLElement | Window

export interface PullToRefreshRootProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  disabled?: boolean
  onRefresh: () => void | Promise<void>
  scrollContainer?: ScrollTarget | RefObject<HTMLElement | null>
  threshold?: number
}

export type PullToRefreshIndicatorProps = HTMLAttributes<HTMLDivElement>
export type PullToRefreshContentProps = HTMLAttributes<HTMLDivElement>

interface Session {
  armed: boolean
  intent: GestureIntent
  pointerId: number
  startX: number
  startY: number
}

const DEFAULT_THRESHOLD = 72
const REFRESH_HOLD_DISTANCE = 52
const Context = createContext(false)

function getScrollTop(target: ScrollTarget): number {
  return target === window
    ? target.scrollY || target.document.documentElement.scrollTop
    : (target as HTMLElement).scrollTop
}

function resolveScrollTarget(
  root: HTMLDivElement,
  explicit: PullToRefreshRootProps['scrollContainer'],
): ScrollTarget {
  if (explicit) {
    if ('current' in explicit) return explicit.current ?? window
    return explicit
  }

  let element: HTMLElement | null = root
  while (element) {
    const style = window.getComputedStyle(element)
    const canScroll = /(auto|scroll|overlay)/.test(style.overflowY)
    if (canScroll || element.scrollTop !== 0) return element
    element = element.parentElement
  }
  return window
}

function reportRefreshError(error: unknown) {
  console.error('PullToRefresh onRefresh rejected', error)
}

const Root = forwardRef<HTMLDivElement, PullToRefreshRootProps>(function Root(
  {
    children,
    disabled = false,
    onRefresh,
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

  function setRoot(node: HTMLDivElement | null) {
    rootRef.current = node
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

  function settle() {
    sessionRef.current = null
    setDistance(0, 0, 0)
    setState('settling')
  }

  function commitRefresh() {
    if (refreshingRef.current) return
    refreshingRef.current = true
    sessionRef.current = null
    setDistance(REFRESH_HOLD_DISTANCE, 1, 0)
    setState('refreshing')

    let result: void | Promise<void>
    try {
      result = onRefresh()
    } catch (error) {
      reportRefreshError(error)
      refreshingRef.current = false
      if (mountedRef.current) settle()
      return
    }

    void Promise.resolve(result).then(
      () => {
        refreshingRef.current = false
        if (mountedRef.current) settle()
      },
      (error: unknown) => {
        reportRefreshError(error)
        refreshingRef.current = false
        if (mountedRef.current) settle()
      },
    )
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    onPointerDown?.(event)
    if (
      event.defaultPrevented ||
      disabled ||
      refreshingRef.current ||
      !event.isPrimary ||
      (event.pointerType === 'mouse' && event.button !== 0)
    ) {
      return
    }
    const root = rootRef.current
    if (
      !root ||
      !isAtScrollStart(getScrollTop(resolveScrollTarget(root, scrollContainer)))
    ) {
      return
    }
    sessionRef.current = {
      armed: false,
      intent: 'pending',
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
    setState('pending')
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    onPointerMove?.(event)
    const session = sessionRef.current
    if (!session || event.pointerId !== session.pointerId || disabled) return

    const deltaX = event.clientX - session.startX
    const deltaY = event.clientY - session.startY
    if (session.intent === 'pending') {
      session.intent = classifyIntent(deltaX, deltaY)
      if (session.intent === 'reject') {
        sessionRef.current = null
        setState('idle')
        return
      }
    }
    if (session.intent !== 'pull') return

    event.preventDefault()
    const metrics = getPullMetrics(deltaY, threshold)
    session.armed = getArmedState(session.armed, metrics.distance, threshold)
    setDistance(metrics.distance, metrics.progress, metrics.overshoot)
    setState(session.armed ? 'armed' : 'pulling')
  }

  function finishPointer(
    event: ReactPointerEvent<HTMLDivElement>,
    cancelled: boolean,
  ) {
    const session = sessionRef.current
    if (!session || event.pointerId !== session.pointerId) return
    sessionRef.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    if (!cancelled && session.intent === 'pull' && session.armed)
      commitRefresh()
    else if (session.intent === 'pull') settle()
    else setState(disabled ? 'disabled' : 'idle')
  }

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      sessionRef.current = null
    }
  }, [])

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const target = resolveScrollTarget(root, scrollContainer)
    const updateBoundary = () => {
      root.dataset.atTop = String(isAtScrollStart(getScrollTop(target)))
    }
    updateBoundary()
    target.addEventListener('scroll', updateBoundary, { passive: true })
    return () => target.removeEventListener('scroll', updateBoundary)
  }, [scrollContainer])

  useEffect(() => {
    if (state !== 'pending' && state !== 'pulling' && state !== 'armed') return
    const cancel = () => {
      sessionRef.current = null
      setDistance(0, 0, 0)
      setState(disabled ? 'disabled' : 'settling')
    }
    window.addEventListener('blur', cancel)
    return () => window.removeEventListener('blur', cancel)
  }, [disabled, state])

  useEffect(() => {
    if (disabled && !refreshingRef.current) {
      sessionRef.current = null
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

  if (threshold <= 0) {
    throw new Error('PullToRefresh threshold must be greater than zero')
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
          finishPointer(event, true)
        }}
        onPointerCancel={(event) => {
          onPointerCancel?.(event)
          finishPointer(event, true)
        }}
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
