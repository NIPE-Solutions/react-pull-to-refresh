# Browser behavior

Pull-to-refresh is partly a browser-gesture problem. Element-scoped interactions
are more controllable than page-level native overscroll, especially on iOS Safari.

**Page-level custom Pull to Refresh on iOS Safari is not a guaranteed
configuration. Safari may retain native browser Pull-to-Refresh ownership.**

## Evidence, not a mobile support guarantee

| Environment          | Logic / E2E                         | Real touch                  | Native PTR conflict         |
| -------------------- | ----------------------------------- | --------------------------- | --------------------------- |
| Chromium desktop     | Automated + trusted CDP touch input | Physical mobile not implied | Desktop n/a                 |
| Android Chrome       | Chromium engine coverage            | Manual required             | Test page refresh           |
| Firefox desktop      | Automated DOM and mouse traces      | n/a                         | Desktop n/a                 |
| Firefox Android      | Firefox engine coverage             | Manual required             | Test                        |
| WebKit desktop       | Automated DOM and mouse traces      | n/a                         | Desktop n/a                 |
| iPhone / iPad Safari | WebKit evidence only                | Manual required             | Native page refresh may win |

See [real-device QA](REAL_DEVICE_QA.md) for actual run status and beta gates.
`page.mouse` validates state mechanics, not mobile touch arbitration. Synthetic
DOM Touch Events validate adapter cancellation and cleanup; they do not start
native scrolling. Chromium CDP input exercises the browser's touch pipeline,
including a forced compatibility-adapter test, but is not Safari or Android
hardware. Desktop WebKit emulation is not physical iOS Safari.

## Element scrollers

The application owns scroll layout and overscroll policy. The root no longer
sets overflow or overscroll containment. For example:

```css
.scroll-container {
  height: 400px;
  overflow-y: auto;
  overscroll-behavior-y: contain;
}
```

Place PTR inside that container, or apply this class to Root when Root itself
should scroll. Containment is optional application policy, not required
mechanical CSS. It can stop scroll chaining at this surface; test the resulting
nested-scroll experience. Do not apply it to a non-scrolling wrapper expecting
it to control Window.

## Page scrollers and native refresh

The Window is used when automatic detection finds no actually scrollable
ancestor. Normal upward finger movement must remain available to scroll the
page. Chromium applications intentionally replacing native page refresh can
use `html { overscroll-behavior-y: contain; }` on the viewport scrolling surface.
This is not a universal native-refresh suppression recipe. The library never
mutates `html` or `body`, and never installs a document-level cancellation hack.
Safari may retain native PTR ownership despite overscroll CSS, particularly for
page-level gestures. Test installed PWAs, embedded web views, browser chrome,
and OS versions separately. The accessible application refresh button remains
the reliable alternative.

## Scroll ownership

```text
gesture starts at an eligible origin
  ↓
resolve the actual root/ancestor owner; inspect nested origin → root chain
  ↓
can a relevant surface consume downward finger movement toward its top?
  ├─ yes → scroll wins for this entire gesture
  └─ no, all relevant surfaces at top
       ↓
     downward intent after slop + boundary still valid → PTR may claim
```

Automatic resolution walks from Root upward and selects the first element with
`overflow-y: auto | scroll | overlay` AND `scrollHeight > clientHeight + 1`.
It skips non-scrollable auto wrappers and otherwise uses Window. Resolution
runs at gesture start, so content growth does not leave a mount-time owner
cached forever. An explicit HTMLElement or Window is honored as supplied. An
explicit ref with `current === null` leaves PTR ineligible; it is resolved again
on the next gesture without needing a new ref object or a React effect.

Every actually scrollable element on the path from the origin through Root
to an ancestor owner must also be at its top. An unrelated explicit owner is
checked alongside the origin-to-root chain. A nearer inner scroller below its top wins even if the outer
owner is at zero. If the nearest inner surface is at zero but another relevant
surface is not, that surface retains scrolling. Non-scrollable descendants are
skipped. Fractional and negative offsets up to one CSS pixel count as the top.

This check is for **downward finger intent**. Upward and horizontal gestures are
abandoned after the six-pixel dead zone. A gesture starting below the top stays
browser-owned even if it reaches zero; start a new gesture to refresh. The owner
and chain are rechecked before claim; changed owners or boundaries abandon the
candidate. No mid-stream takeover is attempted.

## Browser gesture ownership

```text
CSS / browser gesture policy established before contact
  ↓
browser may start native pan and cancel the pointer stream
  ↓
PTR must establish ownership before that decision becomes irreversible
```

In directional-capable engines the root uses Pointer Events with
`touch-action: pan-x pan-down pinch-zoom` at the top while enabled and not
refreshing. Here **pan-down permits scrolling down (finger up)**. Finger down
is the direction reserved for custom PTR. Away from the boundary the policy is
`auto`. See the [directional policy ADR](adr/0001-touch-ownership.md).

Chromium supports the directional keywords. Firefox and Safari/WebKit currently
do not, including their Android/iOS variants. Detection uses
`CSS.supports('touch-action', 'pan-x pan-down pinch-zoom')`; this checks syntax
support, not physical gesture reliability. No user-agent sniffing is used.

When unsupported, CSS remains `auto` and Touch Events adapt into the same intent,
resistance, threshold, hysteresis, and lifecycle mechanics. `touchstart` creates
a candidate without preventing default. Only a cancelable downward move after
intent and boundary checks is prevented. The non-passive `touchmove` listener
exists on this root only for the candidate session. End, cancel, abandonment,
disabling, blur, and unmount remove it. Additional touches abandon the session;
zoom remains available. An uncancelable move is abandoned, never forcibly taken
over. Pointer Events for touch are ignored on this path to avoid duplicate
commits; mouse/pen still use Pointer Events.

Touch cancellation on the first relevant move is a compatibility strategy, not
proof that every Safari/Firefox mobile configuration will surrender its stream.
Real-device validation remains beta-blocking. No retry of a browser-owned stream
and no early `preventDefault()` are used.

## Composition limits and troubleshooting

- **Inner scroller isn't at top:** PTR intentionally does not claim. Scroll the
  relevant chain to its top, then start a new gesture.
- **Gesture started while the page wasn't at top:** scroll owns that stream.
- **iOS Safari triggers native PTR:** Safari may retain page overscroll ownership;
  use the button or test an element-scoped surface.
- **Input/textarea/select/contenteditable:** these origins are intentionally
  ignored to protect editing, caret placement, selection handles and long press.
  Buttons and links retain taps. PTR never changes focus.
- **Custom editor, map, canvas or gesture surface:** add
  `data-pull-to-refresh-ignore` to the surface or an ancestor. This suppresses
  initiation in JS; it cannot override restrictive ancestor CSS.
- **Browser lacks directional touch-action:** the compatibility adapter is used.
  A browser-owned or uncancelable stream is still left alone.
- **Nested scroller at top but no refresh:** CSS touch-action intersection stops
  at the nearest CSS scroll container, which can be inside Root (even an empty
  overflow wrapper). Root's directional policy may not govern that surface.
  Treat nested top as eligibility, not guaranteed touch delivery; put PTR inside
  the intended scroller or provide a refresh button. Do not force `touch-action:
none` across the subtree.
- **Sticky header won't stick:** core.css no longer creates a scroll container
  on Root. Put sticky content inside Content and inspect application ancestor
  overflow/height. Content is transformed, which still establishes a containing
  block for fixed/absolute descendants; portals remain appropriate for overlays.
- **Custom CSS:** ancestor `touch-action`, transforms, scroll containment, or
  replacing core mechanics can change browser delivery. Changing touch-action
  during pointerdown is too late for the current gesture. Boundary attributes
  update on renders and observed scroll events; unusual imperative layout/ref
  changes should be followed by a render before touch, or a subsequent gesture.

## Mechanical CSS

`core.css` supplies relative positioning, indicator positioning/opacity, content
translation, directional touch policy, and settling/hold transitions. It creates
no scroll container, does not clip Root, and does not enforce page policy.
No clipping was required by the mechanics; therefore neither `overflow:hidden`
nor `overflow:clip` is imposed. Consumers may clip an outer visual shell if needed,
but must account for sticky and scroll behavior. `theme.css` remains optional.

[Chromium overscroll containment guidance](https://developer.chrome.com/blog/overscroll-behavior/)
explains its page-refresh and scroll-chaining policy. It is engine guidance,
not a cross-browser guarantee.
