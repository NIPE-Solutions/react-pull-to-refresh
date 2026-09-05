# React Pull to Refresh

Pull to refresh for React, without owning your data.

A small, accessible pull-to-refresh primitive with scroll arbitration,
resistance, and an async refresh lifecycle.

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

The root resolves an explicit scroll container or the nearest ancestor with
scrollable vertical overflow, then falls back to the window. A one-pixel
tolerance includes fractional and negative WebKit offsets. Movement must clearly
favor downward intent; horizontal and upward movement are rejected.

For page-level custom pull-to-refresh, browser-native refresh can still win.
Choose document containment explicitly in your application when appropriate:

```css
html {
  overscroll-behavior-y: contain;
}
```

The library never modifies html or body styles.

## Accessibility

The gesture must not be the only refresh path. Pass the same application
function to a normal button. Add a polite status announcement only when it
benefits the product. The primitive adds no progress role, live region,
keyboard gesture, or focus movement.

## Browser notes

- Chromium supports element overscroll containment and Pointer Events.
- Firefox uses the same mechanics but presents overscroll differently.
- Safari can report negative offsets while rubber-banding; real-device
  validation remains required.
- Desktop primary-button dragging exists for demos and tests.

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

Current status: 0.1.0-alpha.0. Automated checks do not replace the manual device
matrix.

Part of [NIPE Open Source](https://opensource.nipesolutions.com).

## License

[MIT](LICENSE)
