# React Pull to Refresh

Pull to refresh without owning your feed.

A small, accessible pull-to-refresh primitive with scroll arbitration,
resistance, and an async refresh lifecycle.

Mobile pull-to-refresh depends on browser gesture ownership. See
[Browser Behavior](docs/BROWSER_BEHAVIOR.md).

```bash
npm install @nipe-solutions/react-pull-to-refresh
```

```tsx
import { PullToRefresh } from '@nipe-solutions/react-pull-to-refresh'
import '@nipe-solutions/react-pull-to-refresh/core.css'

export function Inbox() {
  async function refresh() {
    await refetch()
  }

  return (
    <>
      <button type="button" onClick={() => void refresh()}>
        Refresh inbox
      </button>
      <PullToRefresh.Root onRefresh={refresh}>
        <PullToRefresh.Indicator>
          <Spinner />
        </PullToRefresh.Indicator>
        <PullToRefresh.Content>
          <Messages />
        </PullToRefresh.Content>
      </PullToRefresh.Root>
    </>
  )
}
```

## Why this exists

Pull-to-refresh coordinates downward intent, the active scroll boundary,
resistance, threshold hysteresis, exactly-once refresh commitment, and settling.
It does not fetch data, own a cache, render a feed, or manage application errors.

## API

| Root prop       | Type                               | Default  | Purpose                                                     |
| --------------- | ---------------------------------- | -------- | ----------------------------------------------------------- |
| onRefresh       | function returning void or Promise | required | Runs the application-owned refresh.                         |
| threshold       | number                             | 72       | Visual pull distance required to arm.                       |
| disabled        | boolean                            | false    | Cancels an uncommitted gesture without disabling scrolling. |
| scrollContainer | HTMLElement, Window, or ref        | auto     | Overrides nearest scroll-surface detection.                 |

Root exposes data-state with idle, pending, pulling, armed, refreshing,
settling, or disabled. Indicator positions consumer-owned visual content and is
aria-hidden. Content provides a transform-isolated wrapper.

## CSS

Import core.css for mechanics. theme.css is an optional neutral starting point;
styles.css combines both.

```css
@import '@nipe-solutions/react-pull-to-refresh/core.css';
```

Available root variables:

- --ptr-distance: resisted visual distance in pixels
- --ptr-progress: threshold progress clamped from 0 to 1
- --ptr-overshoot: resisted distance beyond the threshold
- --ptr-threshold: configured threshold

## Scroll ownership

The root resolves an explicit owner or the nearest actually scrollable ancestor,
then Window. It checks nested scrollers from the gesture origin and rechecks the
boundary before claim. An explicit null ref stays unresolved until a subsequent
gesture. Gestures starting below the top stay browser-owned for that stream.

Core CSS does not set root overflow or overscroll policy. Apply optional
`overscroll-behavior-y: contain` to your actual scroller. Chromium page-level
containment may help suppress native refresh; it is not a universal guarantee.
Page-level custom Pull to Refresh on iOS Safari is not a guaranteed configuration.
Safari may retain native browser Pull-to-Refresh ownership.

## Accessibility

The gesture must not be the only refresh path. Pass the same application
function to a normal button. Add a polite status announcement only when it
benefits the product. The primitive adds no progress role, live region,
keyboard gesture, or focus movement.

## Browser notes

Directional-capable browsers use Pointer Events with `pan-x pan-down pinch-zoom`.
Firefox/Safari use a session-scoped Touch Events compatibility adapter. Automated
engine tests do not verify physical iOS or Android behavior. Mobile QA remains
beta-blocking; use an application refresh button as the accessible alternative.

See [browser behavior](docs/BROWSER_BEHAVIOR.md),
[integrations](docs/INTEGRATIONS.md), and
[real-device QA](docs/REAL_DEVICE_QA.md).

## When not to use it

Prefer a refresh button when the app is desktop-only, content does not scroll,
browser-native refresh is enough, or refresh requires explicit confirmation.

## Development

```bash
npm install
npm run check
npm run test:e2e
```

Requires Node 24. React 18.3 and React 19 are peer-supported. Runtime
dependencies are limited to React peers.

Current status: 0.1.0-alpha.1. Automated checks do not replace the manual device
matrix.

Part of [NIPE Open Source](https://opensource.nipesolutions.com).

## License

[MIT](LICENSE)
