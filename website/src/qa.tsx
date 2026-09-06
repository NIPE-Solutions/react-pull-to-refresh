import { StrictMode, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { PullToRefresh } from '../../src'
import '../../src/core.css'

function QA() {
  const query = new URLSearchParams(location.search)
  const mode = query.get('mode') ?? 'page'
  const threshold = Number(query.get('threshold') ?? 72)
  const ref = useRef<HTMLDivElement>(null)
  const [resolved, setResolved] = useState(false)
  const [count, setCount] = useState(0)
  const [outcome, setOutcome] = useState('Ready')
  const [long, setLong] = useState(false)
  const refresh = async () => {
    setCount((n) => n + 1)
    setOutcome('Refreshing')
    await new Promise((resolve) => setTimeout(resolve, 600))
    setOutcome(query.has('reject') ? 'Rejected' : 'Resolved')
    if (query.has('reject')) throw Error('Application refresh failure')
  }
  return (
    <>
      <p>
        Device QA: {mode}. <a href="/qa/?mode=page">Page</a> ·{' '}
        <a href="/qa/?mode=element">Element</a> ·{' '}
        <a href="/qa/?mode=nested">Nested</a> ·{' '}
        <a href="/qa/?mode=delayed">Delayed ref</a> ·{' '}
        <a href="/qa/?mode=large">Large list</a> ·{' '}
        <a href="/qa/?mode=instances">1000 instances</a>
      </p>
      <button
        onClick={() => {
          void refresh().catch(() => {})
        }}
      >
        Refresh
      </button>
      <button onClick={() => setResolved(true)}>Resolve ref</button>
      <button onClick={() => setLong(true)}>Grow content</button>
      <output data-testid="count">{count}</output> <output>{outcome}</output>
      <div
        ref={resolved ? ref : undefined}
        data-testid="owner"
        style={
          mode !== 'page' && mode !== 'instances'
            ? { height: 400, overflowY: 'auto', overscrollBehaviorY: 'contain' }
            : {}
        }
      >
        <div
          data-testid="auto"
          style={{
            overflowY: mode === 'auto' ? 'auto' : undefined,
            height: mode === 'auto' && long ? 200 : undefined,
          }}
        >
          <PullToRefresh.Root
            data-testid="qa-root"
            onRefresh={refresh}
            threshold={threshold}
            {...(mode === 'delayed' ? { scrollContainer: ref } : {})}
          >
            <PullToRefresh.Indicator>Refreshing…</PullToRefresh.Indicator>
            <PullToRefresh.Content>
              <header
                data-testid="sticky"
                style={{
                  position: 'sticky',
                  top: 0,
                  background: '#eee',
                  padding: 12,
                }}
              >
                Sticky header
              </header>
              <div data-testid="origin" style={{ height: 100 }}>
                Start gestures here
              </div>
              <button onClick={() => setOutcome('Tapped')}>Tap me</button>{' '}
              <a href="#target">Link</a>
              <input aria-label="Input" />
              <textarea aria-label="Textarea" />
              <select aria-label="Select">
                <option>One</option>
                <option>Two</option>
              </select>
              <div contentEditable suppressContentEditableWarning>
                Editable text
              </div>
              <div data-pull-to-refresh-ignore style={{ height: 30 }}>
                Ignored gesture surface
              </div>
              {mode === 'nested' && (
                <div
                  data-testid="nested"
                  style={{ height: 150, overflowY: 'auto' }}
                >
                  <div data-testid="nested-origin" style={{ height: 600 }}>
                    Nested comments
                  </div>
                </div>
              )}
              <div style={{ overflowX: 'auto', width: 280 }}>
                <div style={{ width: 1200 }}>Horizontal carousel</div>
              </div>
              {Array.from({ length: mode === 'large' ? 10000 : 30 }, (_, i) => (
                <p key={i}>Content row {i}</p>
              ))}
              <div id="target">End</div>
            </PullToRefresh.Content>
          </PullToRefresh.Root>
        </div>
      </div>
      {mode === 'instances' &&
        Array.from({ length: 1000 }, (_, i) => (
          <PullToRefresh.Root key={i} onRefresh={() => {}}>
            Idle {i}
          </PullToRefresh.Root>
        ))}
    </>
  )
}
const container = document.getElementById('root')
if (!container) throw Error('Missing root')
createRoot(container).render(
  <StrictMode>
    <QA />
  </StrictMode>,
)
