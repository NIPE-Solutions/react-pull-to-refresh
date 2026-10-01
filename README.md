# React Pull to Refresh

Add a downward refresh gesture to a React feed while keeping your existing data
fetching and cache. Useful for inboxes, activity lists, and other scrolling views
where people expect to pull at the top to check for updates.

The package coordinates scroll ownership, pull resistance, release thresholds,
and the pending refresh animation. You supply the refresh function, content,
indicator, and error handling. An ordinary refresh button remains available to
everyone, including people who cannot use the gesture.

[Demos and documentation](https://react-pull-to-refresh.nipesolutions.com) ·
[npm](https://www.npmjs.com/package/@nipe-solutions/react-pull-to-refresh) ·
[API reference](docs/API.md)

## Install

```bash
npm install @nipe-solutions/react-pull-to-refresh
```

Supports React 18.3 and React 19 with the matching `react-dom` peer. There are no
additional runtime dependencies.

## Refresh a scrolling inbox

This component accepts the current messages and your async reload function. Both
the button and the gesture use the same handler, which prevents overlapping
requests and reports success or failure. Your parent component updates `messages`
when `refreshMessages` loads new data.

```tsx
import { useRef, useState } from 'react'
import { PullToRefresh } from '@nipe-solutions/react-pull-to-refresh'
import '@nipe-solutions/react-pull-to-refresh/core.css'

interface InboxProps {
  messages: readonly { id: string; subject: string }[]
  refreshMessages: () => Promise<void>
}

export function Inbox({ messages, refreshMessages }: InboxProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const inFlight = useRef(false)
  const [refreshing, setRefreshing] = useState(false)
  const [status, setStatus] = useState('')

  async function refresh() {
    if (inFlight.current) return
    inFlight.current = true
    setRefreshing(true)
    setStatus('Refreshing inbox…')

    try {
      await refreshMessages()
      setStatus('Inbox updated.')
    } catch {
      setStatus('Could not refresh. Please try again.')
    } finally {
      inFlight.current = false
      setRefreshing(false)
    }
  }

  return (
    <section aria-label="Inbox">
      <button
        type="button"
        disabled={refreshing}
        onClick={() => void refresh()}
      >
        Refresh inbox
      </button>
      <p role="status">{status}</p>
      <div
        ref={scrollRef}
        style={{
          height: '20rem',
          overflowY: 'auto',
          overscrollBehaviorY: 'contain',
        }}
      >
        <PullToRefresh.Root
          onRefresh={refresh}
          disabled={refreshing}
          scrollContainer={scrollRef}
        >
          <PullToRefresh.Indicator>
            <span style={{ padding: '0.5rem' }}>↻</span>
          </PullToRefresh.Indicator>
          <PullToRefresh.Content>
            <ul>
              {messages.map((message) => (
                <li key={message.id}>{message.subject}</li>
              ))}
            </ul>
          </PullToRefresh.Content>
        </PullToRefresh.Root>
      </div>
    </section>
  )
}
```

`core.css` supplies positioning, translation, and touch policy. It does not
create a scroll container: the outer `div` above provides the scrolling layout.
The explicit ref keeps it the owner even when a short inbox does not overflow.
Its optional overscroll containment limits scroll chaining at that surface.
You can add `theme.css` after core for neutral indicator styling, or use
`styles.css` to import both together.

## Refresh lifecycle and presentation

`onRefresh` runs once when an armed pull is released. Return a promise to keep
the gesture in its refreshing state until the work finishes. Resolution,
rejection, and synchronous throws all settle the gesture; the library does not
display errors, retry requests, or cancel your promise. Handle those concerns in
the application, as the example does.

| Root prop         | Default   | Use                                                                    |
| ----------------- | --------- | ---------------------------------------------------------------------- |
| `onRefresh`       | Required  | Function returning `void` or `Promise<void>`.                          |
| `threshold`       | `72`      | Positive visual pull distance in pixels required to arm.               |
| `disabled`        | `false`   | Cancels an uncommitted gesture while preserving ordinary scrolling.    |
| `scrollContainer` | Automatic | Explicit `HTMLElement`, `Window`, or element ref for scroll ownership. |

Root exposes `data-state`: `idle`, `pending`, `pulling`, `armed`, `refreshing`,
`settling`, or `disabled`. Use it and the `--ptr-distance`, `--ptr-progress`,
`--ptr-overshoot`, and `--ptr-threshold` CSS variables to style your indicator.
Indicator is `aria-hidden`; Content supplies the moving content wrapper. The
primitive adds no live region, keyboard gesture, or focus movement. The example
provides its own status announcement outside the indicator.

## Choose the scroll surface deliberately

Automatic detection selects Root or the nearest ancestor with vertical overflow,
then falls back to Window. Relevant nested scrollers must also be at the top.
A gesture that begins below the top stays with scrolling for that gesture,
even if it later reaches the boundary. Pass `scrollContainer` when your layout
needs an explicit owner; a ref whose `current` is null leaves the gesture
ineligible until a later gesture resolves it.

Page-level custom pull-to-refresh on iOS Safari is not guaranteed: Safari may
retain native browser refresh ownership. Overscroll CSS is application policy,
not a universal way to suppress native refresh. Element scrollers are a more
controllable starting point, but still need testing on the devices you support.
See [browser behavior](docs/BROWSER_BEHAVIOR.md) before choosing page-level use.

Inputs and editable content do not initiate the gesture. Mark custom surfaces
with `data-pull-to-refresh-ignore` when they should keep their own interaction.
For swipeable rows and bottom-sheet feeds, see [integrations](docs/INTEGRATIONS.md).

## Support and limits

Prefer a refresh button alone for desktop-only views, non-scrolling content,
or refresh actions that need confirmation. This package does not fetch data,
manage a cache, virtualize a list, or render a feed.

Directional-capable browsers use Pointer Events; browsers without directional
touch-action support use a session-scoped Touch Events adapter. Automated
Chromium, Firefox, and WebKit checks cover mechanics, keyboard use of fallback
controls, and axe rules. No physical iOS/Android or human screen-reader session
was performed for 1.0.0. Desktop WebKit does not establish physical iOS support.
Keep the refresh button available and consult the [real-device QA checklist](docs/REAL_DEVICE_QA.md).

## Working on the package

Requires Node 24 and npm 11.

```bash
npm install
npm run check
npm run test:e2e
```

See [contributing](CONTRIBUTING.md), [security reporting](SECURITY.md), and
[architecture](docs/ARCHITECTURE.md). Part of
[NIPE Open Source](https://opensource.nipesolutions.com).

## License

[MIT](LICENSE)
