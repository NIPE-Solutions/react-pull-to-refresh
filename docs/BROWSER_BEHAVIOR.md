# Browser behavior

Pull-to-refresh behavior depends on the scroll surface. Element containers are
the recommended default because their boundary and overscroll behavior stay
local. Document-level use can compete with a browser-owned refresh gesture.

| Browser         | Element container | Page-level use         | Native refresh conflict | Evidence                               |
| --------------- | ----------------- | ---------------------- | ----------------------- | -------------------------------------- |
| Chromium        | Automated         | Explicit CSS may apply | Android: yes            | Desktop automated; mobile pending      |
| Firefox         | Automated         | Supported              | Platform-dependent      | Desktop automated; mobile pending      |
| Safari / WebKit | Automated         | Elastic-scroll caveats | iOS varies              | WebKit automated; real devices pending |

## Element scroll containers

This is the common case. `core.css` contains overscroll at the root, and the
library resolves the nearest vertically scrollable ancestor. Pass
`scrollContainer` when the intended owner is ambiguous.

## Page and document scrolling

Chrome on Android commonly owns a downward pull at the document boundary. If
the application intentionally replaces native page refresh, it can opt into
global containment:

```css
html {
  overscroll-behavior-y: contain;
}
```

This is an application decision. The library never mutates `html` or `body`
styles. Test navigation, embedded web views, installed PWAs, and browser
versions used by the product before shipping page-level custom refresh.

## Safari and iOS

Safari rubber-banding may expose fractional or negative scroll offsets. The
boundary helper treats values up to one CSS pixel, including negative values,
as the top. Page-level overscroll suppression differs across iOS versions and
contexts. Nested containers and document-level refresh remain manual
physical-device checks.

## Gesture ownership

The initial pointer remains undecided through a six-pixel movement slop. The
root captures the pointer only after movement is primarily downward and the
scroll boundary is confirmed again. Horizontal or upward intent is rejected
without calling `preventDefault()`.

## Evidence limits

Playwright runs semantic traces in Chromium, Firefox, and WebKit. That covers
state, commitment, cancellation, and layout—not browser chrome or physical
rubber-band feel. See [REAL_DEVICE_QA.md](REAL_DEVICE_QA.md) for the pending
device matrix.
