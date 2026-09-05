import '@fontsource-variable/instrument-sans'
import '@fontsource/fraunces/600.css'
import '@nipe-solutions/react-pull-to-refresh/core.css'
import '@nipe-solutions/react-swipe-actions/core.css'
import '@nipe-solutions/react-spring-bottom-sheet/core.css'
import '@nipe-solutions/react-spring-bottom-sheet/theme.css'
import './site.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import {
  BottomSheetProof,
  GestureLab,
  HeroDemo,
  SwipeIntegration,
} from './demos'
import { LegalPage } from './legal-page'
import { SiteFooter, SiteHeader } from './site-chrome'

const quickStart = `<PullToRefresh.Root onRefresh={refresh}>
  <PullToRefresh.Indicator>
    <YourIndicator />
  </PullToRefresh.Indicator>

  <PullToRefresh.Content>
    <YourContent />
  </PullToRefresh.Content>
</PullToRefresh.Root>`

const accessibleRefresh = `const refresh = async () => {
  await refetch()
}

<button onClick={refresh}>
  Refresh
</button>

<PullToRefresh.Root onRefresh={refresh}>
  ...
</PullToRefresh.Root>`

const browserCss = `html {
  overscroll-behavior-y: contain;
}`

function OwnershipFlow() {
  return (
    <section
      className="ownership section-shell"
      id="behavior"
      data-testid="ownership-flow"
    >
      <div className="section-heading">
        <p className="section-index">01 / decide ownership</p>
        <h2>Who owns the gesture?</h2>
        <p>The primitive stays undecided until direction and boundary agree.</p>
      </div>
      <div className="ownership-flow">
        <div>
          <code>scrollTop &gt; 0</code>
          <span>Scroll container</span>
          <small>PTR does nothing</small>
        </div>
        <div>
          <code>top + downward</code>
          <span>Pull to Refresh</span>
          <small>Claims after intent slop</small>
        </div>
        <div>
          <code>horizontal intent</code>
          <span>Sibling interaction</span>
          <small>Swipe Actions can win</small>
        </div>
      </div>
    </section>
  )
}

function BrowserBehavior() {
  return (
    <section
      className="browser-section"
      id="browser-behavior"
      data-testid="browser-native-ptr"
    >
      <div className="browser-copy">
        <p className="section-index">04 / choose the scroll surface</p>
        <h2>Browser-native pull-to-refresh</h2>
        <p>
          Element containers are the predictable default. Page-level use can
          compete with the browser’s own refresh gesture, especially on Android
          Chrome. The library never changes global document styles.
        </p>
        <pre>
          <code>{browserCss}</code>
        </pre>
        <p className="browser-callout">
          <strong>Opt in deliberately.</strong> Apply global overscroll
          containment only when your application intends to replace
          browser-native page refresh.
        </p>
      </div>
      <div className="scroll-modes">
        <article>
          <span>Preferred</span>
          <h3>Element container</h3>
          <p>Contained boundary and local overscroll behavior.</p>
        </article>
        <article>
          <span>Application decision</span>
          <h3>Page / document</h3>
          <p>May require global CSS to avoid native refresh conflict.</p>
        </article>
        <article>
          <span>Arbitration required</span>
          <h3>Nested interaction</h3>
          <p>Pass the intended scroll owner when detection is ambiguous.</p>
        </article>
      </div>
      <div className="browser-table-wrap">
        <table>
          <thead>
            <tr>
              <th>Browser</th>
              <th>Element container</th>
              <th>Page level</th>
              <th>Native conflict</th>
              <th>Evidence</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th>Chromium</th>
              <td>Automated</td>
              <td>CSS opt-in</td>
              <td>Android: yes</td>
              <td>Desktop automated; mobile Manual pending</td>
            </tr>
            <tr>
              <th>Firefox</th>
              <td>Automated</td>
              <td>Supported</td>
              <td>Platform-dependent</td>
              <td>Desktop automated; mobile Manual pending</td>
            </tr>
            <tr>
              <th>Safari / WebKit</th>
              <td>Automated</td>
              <td>Elastic scroll caveats</td>
              <td>iOS varies</td>
              <td>WebKit automated; iOS Manual pending</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="platform-notes">
        <p>
          <strong>iOS Safari.</strong> Rubber-band scrolling may expose negative
          offsets. The boundary tolerance accepts them, but page-level
          suppression and nested behavior still require physical-device
          validation.
        </p>
        <p>
          <strong>Android Chrome.</strong> Browser-native refresh commonly owns
          a downward page pull. Use an element container, or explicitly contain
          document overscroll when replacing it.
        </p>
      </div>
    </section>
  )
}

function IntegrationProofs() {
  return (
    <section className="integrations section-shell" id="integrations">
      <div className="section-heading">
        <p className="section-index">03 / compose ownership</p>
        <h2>Independent gestures can coexist.</h2>
        <p>
          These are the published packages running together—no shared
          interaction runtime.
        </p>
      </div>
      <div className="integration-grid">
        <div>
          <h3>
            <a href="https://react-swipe-actions.nipesolutions.com/">
              React Swipe Actions
            </a>{' '}
            inside a feed
          </h3>
          <p>
            Horizontal motion reveals a row. Vertical motion stays with
            scrolling. A downward pull at the top belongs to refresh.
          </p>
          <SwipeIntegration />
        </div>
        <div>
          <h3>
            Pull to Refresh inside{' '}
            <a href="https://react-spring-bottom-sheet.nipesolutions.com/">
              React Spring Bottom Sheet
            </a>
          </h3>
          <p>
            The sheet handle remains outside the scrolling feed. The feed
            element is passed explicitly as the pull boundary.
          </p>
          <BottomSheetProof />
          <p className="integration-caveat">
            Automated desktop evidence only. Combined physical-device testing
            remains pending for this alpha.
          </p>
        </div>
      </div>
    </section>
  )
}

function IndicatorExamples() {
  return (
    <section className="indicator-section section-shell" id="indicator">
      <div className="section-heading">
        <p className="section-index">05 / bring the presentation</p>
        <h2>Indicator is a slot, not a brand.</h2>
        <p>
          Mechanics arrive through CSS variables and one state attribute.
          Presentation remains application code.
        </p>
      </div>
      <div
        className="indicator-strip"
        aria-label="Indicator composition examples"
      >
        <div>
          <span className="indicator-arrow">↓</span>
          <b>Arrow</b>
        </div>
        <div>
          <span className="indicator-word">release</span>
          <b>Text</b>
        </div>
        <div>
          <span className="indicator-ring" />
          <b>Progress ring</b>
        </div>
        <div>
          <span className="indicator-mark">72</span>
          <b>Custom mark</b>
        </div>
      </div>
    </section>
  )
}

function App() {
  return (
    <>
      <SiteHeader />
      <main id="top">
        <section className="hero">
          <div className="hero-copy">
            <div className="release-status">
              <span>0.1 alpha</span>
              <i />
              Real-device QA pending
            </div>
            <h1>Pull to refresh without owning your feed.</h1>
            <p className="lede">
              Scroll normally. Pull from the top. Release once armed. Your
              refresh function owns the data.
            </p>
            <div className="install" aria-label="Installation command">
              <code tabIndex={0}>
                npm install @nipe-solutions/react-pull-to-refresh
              </code>
              <a href="#quick-start">Quick start</a>
            </div>
            <dl className="hero-facts">
              <div>
                <dt>Claim</dt>
                <dd>Top + downward</dd>
              </div>
              <div>
                <dt>Threshold</dt>
                <dd>72 px</dd>
              </div>
              <div>
                <dt>Runtime</dt>
                <dd>React only</dd>
              </div>
            </dl>
          </div>
          <div className="hero-demo">
            <div className="pull-axis" aria-hidden="true">
              <span>pull</span>
              <i />
              <span>arm</span>
              <i />
              <span>settle</span>
            </div>
            <HeroDemo />
          </div>
        </section>

        <OwnershipFlow />
        <GestureLab />

        <section className="quick-start section-shell" id="quick-start">
          <div className="section-heading">
            <p className="section-index">The complete component model</p>
            <h2>Three parts. Your data.</h2>
            <p>
              Import the mechanical stylesheet once. Bring any indicator and
              arbitrary React content.
            </p>
          </div>
          <pre>
            <code>{quickStart}</code>
          </pre>
        </section>

        <IntegrationProofs />
        <BrowserBehavior />
        <IndicatorExamples />

        <section
          className="accessible-section section-shell"
          id="accessibility"
          data-testid="accessible-refresh"
        >
          <div className="section-heading">
            <p className="section-index">06 / preserve equivalent access</p>
            <h2>Gesture is an enhancement.</h2>
            <p>
              Use the same application-owned function from a visible button.
              Core injects no hidden control, live region, or focus behavior.
            </p>
          </div>
          <pre>
            <code>{accessibleRefresh}</code>
          </pre>
        </section>

        <section className="docs-band section-shell" id="api">
          <div className="section-heading">
            <p className="section-index">07 / public surface</p>
            <h2>Small by design.</h2>
            <p>Configuration changes composition—not internal physics.</p>
          </div>
          <div className="api-table" aria-label="Public API">
            <div>
              <code>Root</code>
              <span>onRefresh, threshold, disabled, scrollContainer</span>
            </div>
            <div>
              <code>Indicator</code>
              <span>Consumer-owned presentation above the content</span>
            </div>
            <div>
              <code>Content</code>
              <span>
                Transform-isolated wrapper for arbitrary React content
              </span>
            </div>
          </div>
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
