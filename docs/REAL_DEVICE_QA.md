# Real-device QA — beta gate

**No physical-device QA was performed by this automated hardening pass.**
Status is ALPHA READY only after automated checks; BETA READY requires recorded
physical iOS + Android results, including the supported device matrix below.

| Device and browser | Status                                                                  |
| ------------------ | ----------------------------------------------------------------------- |
| iPhone Safari      | Manual pending — beta blocking                                          |
| Android Chrome     | Manual pending — beta blocking                                          |
| Firefox Android    | Manual pending — beta blocking for supported mobile policy              |
| iPad Safari        | Manual pending — beta blocking                                          |
| Desktop Chromium   | Automated browser mechanics + trusted CDP touch                         |
| Desktop Firefox    | Automated browser mechanics + synthetic adapter events                  |
| Desktop WebKit     | Automated browser mechanics + synthetic adapter events; see runner note |

Manual verified requires device model, OS version, browser version, date, tester,
commit identifier, scenario, expected/actual result, and recording or notes.
Never infer real-touch verification from mouse, synthetic DOM or desktop WebKit.

## Fixtures

Run `npm run dev -- --host 0.0.0.0` and open `/qa/` on the LAN address from each
physical device. The noindex QA page links page, element, nested, delayed-ref,
large-list and 1000-idle-instance modes. Query options:

- `?mode=page`: Window scroll, sticky child, no mechanical root overflow.
- `?mode=element`: actual 400px overflow-auto owner outside PTR.
- `?mode=nested`: inner comments panel; scroll it before pulling.
- `?mode=auto`: initially non-scrollable auto wrapper; Grow content makes it scroll.
- `?mode=delayed`: explicit null ref, Resolve ref enables resolution.
- `?mode=large`: 10,000 rows; `?mode=instances`: 1000 idle roots.
- Add `&threshold=4|24|40|72|120`, or `&reject` for rejection cleanup.

The button is application-owned and intentionally does not command the PTR
state machine. Use an actual drag to test PTR promise/hold/settling state.

## Required on each mobile device, separately for page and element

- Finger down at top: custom pull, threshold arms, release calls once.
- Finger up at top: content scrolls down normally.
- Start below top: scroll toward zero; no same-gesture takeover; next gesture
  may pull. Test rapid reversal and native momentum scrolling.
- Horizontal carousel and diagonal movement: browser/child wins.
- Partial pull; arm; reverse slightly; reverse below hysteresis; release.
- Thresholds 4, 24, 40, 72, 120: coherent arm/disarm and no extra hold jump.
- Button/link taps and keyboard refresh; focus remains unchanged.
- Input, textarea, select, contenteditable: edit, caret, long press, selection
  handles, browser zoom; ignored surface never initiates PTR.
- Nested scroller below top, at top with outer below top, all at top, and
  non-scrollable inner: record actual scroll recipient and delivery.
- Second finger/pinch, touchcancel, navigation away/unmount, window blur:
  no stuck pulling, armed or refreshing state; zoom is not blocked.
- Resolve, reject and synchronous-throw lifecycle; repeated release/cancel;
  disable during refresh; no core console warnings/errors or duplicate refresh.
- Scroll during pending refresh; rotate; reduced motion; deterministic settling.
- Window sticky header remains attached to viewport; no root scroll trap.
- Native browser PTR conflict: record whether browser chrome refresh wins,
  with and without application overscroll containment. Test PWA separately.

### Android Chrome directional path

Confirm computed `pan-x pan-down pinch-zoom`. Finger down at top must permit
custom ownership, finger up must scroll, horizontal must preserve child gesture,
and pinch must remain possible. Run both page and element modes.

### Safari and Firefox compatibility path

Confirm directional CSS is unsupported and effective policy is auto. Pending
moves must not be default-prevented. Downward claim alone may prevent a cancelable
move. Upward/horizontal moves remain native. Test gradual and rapid starts:
session-lazy touchmove cancellation may have engine-specific timing limits.
If the browser retains the stream, record that limitation; do not label it
verified or add early/global cancellation to make the checklist green.

**Page-level custom Pull to Refresh on iOS Safari is not a guaranteed
configuration. Safari may retain native browser Pull-to-Refresh ownership.**

## Automated runner note

The local macOS 14 environment has a frozen WebKit binary. Installed Playwright
1.63 fails before page creation (`Unknown setting: PushAPIEnabled`). An isolated
Playwright 1.58.2 runner can execute the same tests against the compatible local
WebKit. This does not change repository dependencies and is older-engine evidence.
Run the normal three-engine suite on a current supported CI OS before beta.

## Result template

| Commit | Device / OS / browser | Date / tester | Surface / scenario | Expected | Actual | Evidence | Status         |
| ------ | --------------------- | ------------- | ------------------ | -------- | ------ | -------- | -------------- |
| —      | —                     | —             | —                  | —        | —      | —        | Manual pending |
