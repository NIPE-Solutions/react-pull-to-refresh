import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import { SwipeActions } from '@nipe-solutions/react-swipe-actions'
import { Sheet } from '@nipe-solutions/react-spring-bottom-sheet'
import { PullToRefresh } from '@nipe-solutions/react-pull-to-refresh'

const initialMessages = [
  ['Mara Chen', 'Gesture trace reviewed', '09:42'],
  ['Release checks', 'Package fixture passed', '08:17'],
  ['Owen Hart', 'Scroll ownership notes', 'Yesterday'],
  ['CI', 'Three browser engines passed', 'Yesterday'],
]

function TensionIndicator() {
  return (
    <div className="tension-indicator">
      <span className="tension-stem" />
      <span className="tension-node" />
      <span className="indicator-copy" />
    </div>
  )
}

function useMetrics(rootRef: RefObject<HTMLDivElement | null>) {
  const distanceRef = useRef<HTMLElement>(null)
  const progressRef = useRef<HTMLElement>(null)
  const stateRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return

    const update = () => {
      const distance = Number.parseFloat(
        root.style.getPropertyValue('--ptr-distance'),
      )
      const progress = Number.parseFloat(
        root.style.getPropertyValue('--ptr-progress'),
      )
      if (distanceRef.current) {
        distanceRef.current.textContent = `${String(Math.round(distance || 0))} px`
      }
      if (progressRef.current) {
        progressRef.current.textContent = (progress || 0).toFixed(2)
      }
      if (stateRef.current) {
        stateRef.current.textContent = root.dataset.state ?? 'idle'
      }
    }

    const observer = new MutationObserver(update)
    observer.observe(root, {
      attributes: true,
      attributeFilter: ['data-state', 'style'],
    })
    update()
    return () => observer.disconnect()
  }, [rootRef])

  return { distanceRef, progressRef, stateRef }
}

function MechanicsReadout({
  rootRef,
}: {
  rootRef: RefObject<HTMLDivElement | null>
}) {
  const metrics = useMetrics(rootRef)
  return (
    <dl className="mechanics-readout" data-testid="hero-metrics">
      <div>
        <dt>pull</dt>
        <dd ref={metrics.distanceRef} data-testid="metric-distance">
          0 px
        </dd>
      </div>
      <div>
        <dt>threshold</dt>
        <dd>72 px</dd>
      </div>
      <div>
        <dt>progress</dt>
        <dd ref={metrics.progressRef}>0.00</dd>
      </div>
      <div>
        <dt>state</dt>
        <dd ref={metrics.stateRef}>idle</dd>
      </div>
    </dl>
  )
}

function FeedRows({ messages }: { messages: string[][] }) {
  return messages.map(([sender, subject, time], index) => (
    <article
      className="message"
      key={`${subject ?? 'message'}-${String(index)}`}
    >
      <span className="avatar" aria-hidden="true">
        {sender?.slice(0, 1)}
      </span>
      <span className="message-copy">
        <strong>{sender}</strong>
        <b>{subject}</b>
        <span>Local documentation data. No network request was made.</span>
      </span>
      <time>{time}</time>
    </article>
  ))
}

export function HeroDemo() {
  const rootRef = useRef<HTMLDivElement>(null)
  const [messages, setMessages] = useState(initialMessages)
  const [announcement, setAnnouncement] = useState('')

  const refresh = useCallback(async () => {
    setAnnouncement('Refreshing')
    await new Promise((resolve) => window.setTimeout(resolve, 520))
    const now = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    })
    setMessages((current) => [
      ['New activity', 'Inbox refreshed', now],
      ...current,
    ])
    setAnnouncement('Refresh complete')
  }, [])

  return (
    <div className="hero-evidence">
      <div className="threshold-marker" aria-hidden="true">
        <span>72 px threshold</span>
      </div>
      <div className="demo-shell" aria-label="Interactive pull-to-refresh demo">
        <div className="demo-toolbar">
          <span>Inbox</span>
          <button type="button" onClick={() => void refresh()}>
            Refresh
          </button>
        </div>
        <PullToRefresh.Root
          ref={rootRef}
          className="demo-feed"
          onRefresh={refresh}
          data-testid="main-demo"
        >
          <PullToRefresh.Indicator>
            <TensionIndicator />
          </PullToRefresh.Indicator>
          <PullToRefresh.Content>
            <div className="demo-hint">
              At the top. Pull until the line arms.
            </div>
            <FeedRows messages={messages} />
          </PullToRefresh.Content>
        </PullToRefresh.Root>
        <p className="sr-only" aria-live="polite">
          {announcement}
        </p>
      </div>
      <MechanicsReadout rootRef={rootRef} />
    </div>
  )
}

type RefreshResult = 'resolve' | 'reject' | 'slow'

export function GestureLab() {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [boundary, setBoundary] = useState('automatic')
  const [result, setResult] = useState<RefreshResult>('resolve')
  const [content, setContent] = useState('short')
  const [motion, setMotion] = useState('system')
  const [outcome, setOutcome] = useState('Ready')

  const runRefresh = useCallback(async () => {
    setOutcome('Refreshing')
    await new Promise((resolve) =>
      window.setTimeout(resolve, result === 'slow' ? 1800 : 240),
    )
    if (result === 'reject') {
      setOutcome('Rejected safely')
      throw new Error('Gesture Lab rejection')
    }
    setOutcome('Refresh complete')
  }, [result])

  const runFromButton = async () => {
    try {
      await runRefresh()
    } catch {
      // The lab reports rejection in its own visible status.
    }
  }

  const rows = content === 'long' ? 12 : 4

  return (
    <section
      className="gesture-lab section-shell"
      id="gesture-lab"
      data-testid="gesture-lab"
    >
      <div className="section-heading">
        <p className="section-index">02 / stress the lifecycle</p>
        <h2>Gesture Lab</h2>
        <p>
          Change one constraint, then pull the real primitive. Failure settles
          through the same lifecycle as success.
        </p>
      </div>
      <div className="lab-panel">
        <div className="lab-controls">
          <label>
            Boundary detection
            <select
              value={boundary}
              onChange={(event) => setBoundary(event.target.value)}
            >
              <option value="automatic">Automatic</option>
              <option value="explicit">Explicit element ref</option>
            </select>
          </label>
          <label>
            Refresh result
            <select
              value={result}
              onChange={(event) =>
                setResult(event.target.value as RefreshResult)
              }
            >
              <option value="resolve">Resolve</option>
              <option value="reject">Reject</option>
              <option value="slow">Slow resolve</option>
            </select>
          </label>
          <label>
            Content
            <select
              value={content}
              onChange={(event) => setContent(event.target.value)}
            >
              <option value="short">Short</option>
              <option value="long">Long</option>
            </select>
          </label>
          <label>
            Motion
            <select
              value={motion}
              onChange={(event) => setMotion(event.target.value)}
            >
              <option value="system">System</option>
              <option value="reduced">Reduced</option>
            </select>
          </label>
        </div>
        <div
          className={`lab-surface ${motion === 'reduced' ? 'demo-reduced-motion' : ''}`}
        >
          <div className="lab-status">
            <span>{outcome}</span>
            <button type="button" onClick={() => void runFromButton()}>
              Run refresh
            </button>
          </div>
          <PullToRefresh.Root
            ref={scrollRef}
            className="lab-scroll"
            {...(boundary === 'explicit' ? { scrollContainer: scrollRef } : {})}
            onRefresh={runRefresh}
            data-testid="lab-root"
          >
            <PullToRefresh.Indicator>
              <TensionIndicator />
            </PullToRefresh.Indicator>
            <PullToRefresh.Content>
              {Array.from({ length: rows }, (_, index) => (
                <div className="lab-row" key={index}>
                  Trace row {index + 1}
                  <span>
                    {index === 0 ? 'pull from here' : 'scroll owns this'}
                  </span>
                </div>
              ))}
            </PullToRefresh.Content>
          </PullToRefresh.Root>
        </div>
      </div>
    </section>
  )
}

const integrationRows = ['Release notes', 'Gesture audit', 'Browser matrix']

export function SwipeIntegration() {
  const [message, setMessage] = useState('Pull vertically or swipe a row')
  return (
    <div
      className="integration-card"
      data-testid="swipe-integration"
      data-integration="swipe-actions"
    >
      <div className="integration-card-head">
        <span>Vertical + horizontal</span>
        <output>{message}</output>
      </div>
      <PullToRefresh.Root
        className="integration-scroll"
        onRefresh={async () => {
          setMessage('Refreshing feed')
          await new Promise((resolve) => window.setTimeout(resolve, 350))
          setMessage('Feed refreshed')
        }}
      >
        <PullToRefresh.Indicator>
          <TensionIndicator />
        </PullToRefresh.Indicator>
        <PullToRefresh.Content>
          <SwipeActions.Group>
            {integrationRows.map((row) => (
              <SwipeActions.Root className="swipe-actions-root" key={row}>
                <SwipeActions.Trailing>
                  <SwipeActions.Action
                    destructive
                    onAction={() => setMessage(`${row} archived`)}
                  >
                    Archive
                  </SwipeActions.Action>
                </SwipeActions.Trailing>
                <SwipeActions.Content>
                  <div className="integration-row">
                    <span>{row}</span>
                    <small>Swipe left</small>
                  </div>
                </SwipeActions.Content>
              </SwipeActions.Root>
            ))}
          </SwipeActions.Group>
        </PullToRefresh.Content>
      </PullToRefresh.Root>
    </div>
  )
}

export function BottomSheetProof() {
  const scrollRef = useRef<HTMLDivElement>(null)
  return (
    <Sheet.Root
      snapPoints={[{ id: 'proof', value: '62%' }]}
      defaultSnapPoint="proof"
    >
      <Sheet.Trigger className="sheet-proof-trigger">
        Open bottom sheet proof
      </Sheet.Trigger>
      <Sheet.Portal>
        <Sheet.Backdrop />
        <Sheet.Viewport>
          <Sheet.Content className="sheet-proof">
            <Sheet.Handle />
            <div className="sheet-proof-heading">
              <div>
                <Sheet.Title>Gesture ownership in a sheet</Sheet.Title>
                <Sheet.Description>
                  The handle owns sheet drag. This scroll area owns content and
                  pull-to-refresh.
                </Sheet.Description>
              </div>
              <Sheet.Close>Close sheet proof</Sheet.Close>
            </div>
            <div className="sheet-scroll" ref={scrollRef}>
              <PullToRefresh.Root
                data-testid="sheet-ptr"
                scrollContainer={scrollRef}
                onRefresh={() =>
                  new Promise((resolve) => window.setTimeout(resolve, 400))
                }
              >
                <PullToRefresh.Indicator>
                  <TensionIndicator />
                </PullToRefresh.Indicator>
                <PullToRefresh.Content>
                  {Array.from({ length: 8 }, (_, index) => (
                    <div className="sheet-row" key={index}>
                      Sheet content {index + 1}
                    </div>
                  ))}
                </PullToRefresh.Content>
              </PullToRefresh.Root>
            </div>
          </Sheet.Content>
        </Sheet.Viewport>
      </Sheet.Portal>
    </Sheet.Root>
  )
}
