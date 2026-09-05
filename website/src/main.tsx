import '@fontsource-variable/instrument-sans'
import '@fontsource/fraunces/600.css'
import '@nipe-solutions/react-pull-to-refresh/core.css'
import './site.css'

import { StrictMode, useCallback, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { PullToRefresh } from '@nipe-solutions/react-pull-to-refresh'
import { LegalPage } from './legal-page'
import { SiteFooter, SiteHeader } from './site-chrome'

const initialMessages = [
  {
    sender: 'Mara Chen',
    subject: 'Mobile navigation review',
    preview: 'The gesture trace looks good on the compact viewport.',
    time: '09:42',
    color: '#217c86',
  },
  {
    sender: 'Release checks',
    subject: 'Package fixture passed',
    preview: 'ESM, CommonJS, declarations, and CSS entrypoints verified.',
    time: '08:17',
    color: '#f06449',
  },
  {
    sender: 'Owen Hart',
    subject: 'Scroll ownership notes',
    preview: 'The nested modal no longer claims upward movement.',
    time: 'Yesterday',
    color: '#9e6b3f',
  },
  {
    sender: 'CI',
    subject: 'Browser suite complete',
    preview: 'Chromium, Firefox, and WebKit are reporting green.',
    time: 'Yesterday',
    color: '#496c52',
  },
]

const code = `<PullToRefresh.Root onRefresh={refresh}>
  <PullToRefresh.Indicator>
    <Spinner />
  </PullToRefresh.Indicator>

  <PullToRefresh.Content>
    <Feed />
  </PullToRefresh.Content>
</PullToRefresh.Root>`

function PullIndicator() {
  return (
    <div className="demo-indicator">
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <circle cx="24" cy="24" r="20" />
        <path d="M24 13v19m0 0 7-7m-7 7-7-7" />
      </svg>
      <span className="indicator-copy" />
    </div>
  )
}

function Demo() {
  const [messages, setMessages] = useState(initialMessages)
  const [announcement, setAnnouncement] = useState('')

  const refresh = useCallback(async () => {
    setAnnouncement('Refreshing')
    await new Promise((resolve) => window.setTimeout(resolve, 650))
    const now = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    })
    setMessages((current) => [
      {
        sender: 'New activity',
        subject: 'Inbox refreshed',
        preview: 'This item was added locally by the documentation demo.',
        time: now,
        color: '#f06449',
      },
      ...current,
    ])
    setAnnouncement('Refresh complete')
  }, [])

  return (
    <div className="demo-shell" aria-label="Interactive pull-to-refresh demo">
      <div className="demo-toolbar">
        <span>Inbox</span>
        <button type="button" onClick={() => void refresh()}>
          Refresh
        </button>
      </div>
      <PullToRefresh.Root
        className="demo-feed"
        onRefresh={refresh}
        data-testid="main-demo"
      >
        <PullToRefresh.Indicator>
          <PullIndicator />
        </PullToRefresh.Indicator>
        <PullToRefresh.Content>
          <div className="demo-hint">Scroll to the top, then pull down</div>
          {messages.map((message, index) => (
            <article
              className="message"
              key={message.subject + '-' + String(index)}
            >
              <span
                className="avatar"
                style={{ backgroundColor: message.color }}
                aria-hidden="true"
              >
                {message.sender.slice(0, 1)}
              </span>
              <span className="message-copy">
                <strong>{message.sender}</strong>
                <b>{message.subject}</b>
                <span>{message.preview}</span>
              </span>
              <time>{message.time}</time>
            </article>
          ))}
        </PullToRefresh.Content>
      </PullToRefresh.Root>
      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>
    </div>
  )
}

function App() {
  return (
    <>
      <SiteHeader />

      <main id="top">
        <section className="hero">
          <div className="hero-copy">
            <h1>Pull to refresh for React, without owning your data.</h1>
            <p className="lede">
              A focused primitive for scroll arbitration, progressive
              resistance, threshold state, and one clean async refresh
              lifecycle.
            </p>
            <div className="install" aria-label="Installation command">
              <code>npm install @nipe-solutions/react-pull-to-refresh</code>
              <a href="#quick-start">Read the setup</a>
            </div>
            <dl className="hero-facts">
              <div>
                <dt>Runtime</dt>
                <dd>React only</dd>
              </div>
              <div>
                <dt>Motion</dt>
                <dd>CSS variables</dd>
              </div>
              <div>
                <dt>Data</dt>
                <dd>Always yours</dd>
              </div>
            </dl>
          </div>
          <div className="hero-demo">
            <div className="waterline" aria-hidden="true">
              <span>release</span>
              <i />
              <span>pull</span>
            </div>
            <Demo />
          </div>
        </section>

        <section className="ownership" id="behavior">
          <div>
            <h2>One gesture. Two clear owners.</h2>
            <p>
              The primitive owns the interaction mechanics. Your application
              keeps every decision about data and presentation.
            </p>
          </div>
          <div className="ownership-columns">
            <div>
              <h3>The library owns</h3>
              <p>
                Intent, top-boundary detection, resistance, threshold,
                commitment, refreshing, and settling.
              </p>
            </div>
            <div>
              <h3>Your app owns</h3>
              <p>
                Fetching, cache invalidation, errors, retries, content, empty
                states, and announcements.
              </p>
            </div>
          </div>
        </section>

        <section className="quick-start" id="quick-start">
          <div className="section-heading">
            <h2>Three parts, no framework.</h2>
            <p>
              Import the mechanical stylesheet once. Bring any indicator and any
              content.
            </p>
          </div>
          <pre>
            <code>{code}</code>
          </pre>
        </section>

        <section className="trace" aria-labelledby="trace-title">
          <div>
            <h2 id="trace-title">A predictable gesture trace</h2>
            <p>
              Ordinary scrolling remains native. Pull-to-refresh only enters
              after downward intent is clear at the top boundary.
            </p>
          </div>
          <ol>
            <li>
              <b>idle</b>
              <span>Native scrolling owns the surface.</span>
            </li>
            <li>
              <b>pulling</b>
              <span>Visual distance follows with resistance.</span>
            </li>
            <li>
              <b>armed</b>
              <span>Release commits exactly one refresh.</span>
            </li>
            <li>
              <b>refreshing</b>
              <span>The returned promise owns the hold time.</span>
            </li>
            <li>
              <b>settling</b>
              <span>Content returns cleanly to zero.</span>
            </li>
          </ol>
        </section>

        <section className="docs-band" id="api">
          <div className="section-heading">
            <h2>Small by design.</h2>
            <p>
              The v1 surface exposes mechanics that change composition—not
              internal physics knobs.
            </p>
          </div>
          <div className="api-table" role="table" aria-label="Public API">
            <div role="row">
              <code>Root</code>
              <span>onRefresh, threshold, disabled, scrollContainer</span>
            </div>
            <div role="row">
              <code>Indicator</code>
              <span>Visual content positioned above the feed</span>
            </div>
            <div role="row">
              <code>Content</code>
              <span>
                Transform-isolated wrapper for arbitrary React content
              </span>
            </div>
          </div>
        </section>

        <section className="notes">
          <article>
            <h2>Accessibility</h2>
            <p>
              A pull gesture must never be the only refresh path. Reuse your
              refresh function from a visible button, and add status
              announcements only when your product needs them. Core injects no
              role, live region, or focus behavior.
            </p>
          </article>
          <article>
            <h2>Browser behavior</h2>
            <p>
              Element containers use local overscroll containment. For
              document-level use, suppressing browser-native pull-to-refresh is
              an application CSS decision. Safari rubber-banding differs from
              Chromium and still requires real-device validation.
            </p>
          </article>
          <article>
            <h2>Integrations</h2>
            <p>
              Horizontal intent is rejected early so swipeable rows can win. In
              bottom sheets, pass the sheet’s scrolling element explicitly and
              keep sheet drag ownership outside the feed.
            </p>
          </article>
          <article>
            <h2>SSR and performance</h2>
            <p>
              Browser APIs are read only during interaction or effects.
              Per-pixel motion updates CSS variables directly; React renders
              semantic state transitions.
            </p>
          </article>
        </section>
      </main>

      <SiteFooter />
    </>
  )
}

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Missing #root element')

const pathname = window.location.pathname.replace(/\/+$/, '') || '/'
const page =
  pathname === '/imprint' ? (
    <LegalPage kind="imprint" />
  ) : pathname === '/privacy' ? (
    <LegalPage kind="privacy" />
  ) : (
    <App />
  )

createRoot(rootElement).render(<StrictMode>{page}</StrictMode>)
