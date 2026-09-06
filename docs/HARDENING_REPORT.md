# Touch and scroll hardening report

Date: 2026-09-06. Release classification: **ALPHA READY**. This report records the initial
hardening snapshot. Release follow-up results are recorded below.

## 1. Original bugs reproduced

Baseline: 26 unit tests passed; gzip ESM was 2,194 B and core CSS 1,264 B.
New regression tests were run before each corresponding production fix.

| Reproduced failure                                 | Evidence and outcome                                                                                   |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| pan-up permits wrong native direction              | Trusted Chromium touch lost the downward stream; corrected policy retains it                           |
| Root overflow/overscroll containment               | Chromium/Firefox computed CSS and page fixture failed; sticky/Window checks now pass, including WebKit |
| NaN/Infinity accepted                              | Invalid-value tests failed, now reject clearly; <=0 was already rejected                               |
| Small threshold stays armed                        | Threshold 4 reversal test failed, now disarms                                                          |
| Hold adds extra pull                               | Thresholds 24/40 release tests failed, now capped by released distance                                 |
| Refresh rejection and sync throw logged            | Console spies and browser rejection fixture failed; lifecycle now settles quietly                      |
| Null explicit ref becomes Window                   | Start while unresolved incorrectly armed; now idle until resolution                                    |
| Empty overflow-auto wrapper chosen                 | Real outer owner below top was bypassed; empty wrapper now skipped                                     |
| Nested inner scroller bypassed                     | Inner scrollTop 30 still armed outer PTR; now scrolling wins                                           |
| Editing/ignored origins claimed                    | Input, textarea, select, contenteditable and ignore-surface tests failed; now skipped                  |
| No touch compatibility adapter                     | Synthetic touchstart remained idle; shared adapter now handles sessions                                |
| Child implicit capture loss cancels root           | Trusted touch exposed bubbled lostpointercapture; separate regression now passes                       |
| Explicit owner bypasses Root/intermediate scroller | Two ownership tests failed; entire relevant path now checked                                           |
| Native listeners retain old props/callbacks        | Three rerender regressions failed; native input now uses committed current handlers                    |

Cancellation, exactly-once refresh, disabled/unmount behavior, resistance and
accessibility already had useful baseline behavior. These were retained and
extended with regressions rather than reported as entirely new fixes. Physical
Safari/Android problems were not claimed as reproduced without device access.

## 2. Final touch-action strategy

At top, enabled and not refreshing: `pan-x pan-down pinch-zoom`. Otherwise `auto`.
Unsupported directional declarations leave `auto`. Detection uses CSS.supports,
not a UA string. The [ADR](adr/0001-touch-ownership.md) records the specification,
compatibility data and actual Chromium direction experiment.

## 3. Chromium gesture path

Pointer Events → pending slop → downward intent → ownership recheck → root
capture → shared pull mechanics → one refresh on armed release. Trusted CDP
input passes for page and element owners: downward claims, upward scrolls,
horizontal does not refresh, and gestures beginning below top never take over.
Pinch zoom remains declared as available.

## 4. Safari/Firefox fallback strategy

Touch Events feed the same mechanics when directional CSS is unsupported.
Touchstart and pending moves are not prevented; a cancelable downward claim
alone prevents default. Touchmove is non-passive only on Root during a candidate.
Cancellation, additional touches, abandonment, blur, disable and unmount clean up.
Compatibility pointer events do not create a second touch session. Forced
fallback passes trusted Chromium input with auto CSS; synthetic DOM integration
passes Firefox/WebKit. Physical mobile fallback reliability is still pending.

## 5. Root overflow/overscroll changes

Removed both mechanical rules. No root clipping proved necessary, so neither
hidden nor clip is imposed. Optional containment belongs on the application's
actual scrolling surface. Chromium page containment is documented separately
from Safari's native-ownership limitation.

## 6. Sticky behavior result

The real Window fixture's sticky header remains at viewport top after scrolling
300px in Chromium, Firefox and WebKit. Normal wheel movement continues scrolling
Window. The content transform remains; its effect on fixed/absolute descendants
is documented, as are application-owned ancestor overflow constraints.

## 7. Final scroll-owner algorithm

Resolve explicit HTMLElement/Window/ref, or walk Root upward for overflow-y
auto/scroll/overlay with scrollHeight > clientHeight + 1. Otherwise Window.
Resolve at gesture start and require the same owner at claim. Check relevant
scroll consumers along the origin-to-owner path (through Root); for unrelated
explicit owners check origin-to-Root plus the supplied owner. Top tolerance is
one pixel, including fractional and negative offsets.

## 8. Nested scroller behavior

Any relevant consumer below top wins. Empty non-scrollable wrappers are skipped;
an inner surface at top does not bypass a farther relevant consumer below top.
Horizontal/upward intent is rejected. A below-top start remains browser-owned
for the whole gesture. Nested CSS scroll containers may stop touch-action
intersection before Root; eligibility does not guarantee event delivery there.

## 9. Explicit ref fix

Null means unresolved/ineligible, never implicit Window. A resolved .current is
read at the next gesture. Owner changes before claim abandon the candidate.
Native handlers observe current committed props. Imperative changes without a
render can leave the pre-contact CSS policy stale for one gesture; documentation
explains this browser-policy limit rather than relying on late touch-action.

## 10. Threshold/hysteresis changes

Threshold must be finite and >0. Hysteresis is min(6, threshold × 0.25).
Matrices include 4, 24, 40, 72, 120 plus NaN, Infinity, -1 and 0. Six-pixel intent
slop remains. Active gestures retain their threshold despite parent rerenders.
Existing monotonic sublinear resistance is preserved.

## 11. Refresh hold-distance changes

Hold is min(52, session threshold, released distance), including release just
below threshold while hysteresis keeps it armed. Browser tests verify numerical
translation and indicator opacity at thresholds 24, 40, 72 and 120 under reduced
motion. The internal 52px indicator resting convention is documented; no new prop.

## 12. Error lifecycle changes

Resolve, reject and synchronous throw all finish the refresh and settle.
Consumer errors are not logged or given library UI/retry/error callbacks.
Exactly-once commitment, disable-during-refresh, current callback on native
release, unmount safety and reduced-motion timer completion are covered.
The application still owns data, errors, UI meaning and its accessible button.

## 13. Automated browser tests added

17 browser cases added; 45 additional unit cases. Final results:

| Check                                              | Result                                                                                                 |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| npm run check                                      | Passed: formatting, lint, types, 71 unit tests, build, public API, size, package checks, website build |
| Chromium 153.0.8010.12 / Playwright 1.63           | 34 passed                                                                                              |
| Firefox 155.0 / Playwright 1.63                    | 30 passed; 4 Chromium-only CDP cases skipped                                                           |
| WebKit 26.0 / isolated Playwright 1.58.2           | 30 passed; 4 Chromium-only CDP cases skipped                                                           |
| Installed Playwright 1.63 + frozen macOS 14 WebKit | Blocked before page creation: Unknown setting: PushAPIEnabled                                          |
| Console and uncaught-error hygiene                 | All browser suites enforce it                                                                          |
| Accessibility and responsive homepage              | Existing automated checks passed; desktop/mobile screenshots reviewed                                  |
| 1000 idle instances                                | No global touchmove listeners and no idle RAF                                                          |
| 10,000 rows                                        | Gesture and layout fixture passed in all three tested engines                                          |

The compatible WebKit runner was installed outside the repository, with the
same final E2E files copied into it. No dependency/lockfile downgrade was made.
A current supported CI OS must rerun the normal three-engine command before beta.

## 14. Real-device QA completed/pending

None completed in this pass. iPhone Safari, iPad Safari, Android Chrome and
Firefox Android are **manual pending**. [QA](REAL_DEVICE_QA.md) now includes
separate page/element matrices, directional/fallback checks, editing/selection,
zoom, nested scrollers, native PTR conflicts, and a result-recording template.
The noindex `/qa/` website entry provides actual test surfaces.

## 15. iOS Safari native PTR limitations

**Does page-level custom Pull to Refresh work reliably on iOS Safari?**

Reliability is **not established**. Page-level custom Pull to Refresh on iOS
Safari is not a guaranteed configuration. Safari may retain native browser
Pull-to-Refresh ownership. Neither overscroll CSS nor desktop WebKit results
prove suppression of physical iOS browser-native refresh.

## 16. Bundle-size impact

ESM gzip: **2,194 → 3,042 B**, +848 B (~38.7%). Core CSS: **1,264 → 1,276 B**.
The explicit JS budget was adjusted from 3,000 to 3,200 B for the focused
compatibility adapter, current-handler dispatch and scroll-chain checks. The
size check passes against that documented budget; this is not an unchanged-budget
claim. Core CSS retains its existing 3,000 B ceiling.

## 17. Runtime dependency status

Zero added runtime dependencies. React/ReactDOM peers remain the only runtime
requirements. No gesture dependency, polyfill, observer of content mutations,
application error API, or public hold-distance prop was added.

## 18. Remaining limitations

Physical mobile/native-browser behavior remains unverified. Nested scroll
containers may govern CSS touch-action before Root; browser-owned/uncancelable
streams remain untouched. Pre-contact CSS can be stale after purely imperative
layout/ref changes without render. Ignoring an origin in JS does not override
ancestor CSS policy. Root's content transform still affects fixed/absolute
positioning. The local current-runner WebKit environment needs a supported OS.
Website changes are local source changes; deployment was not performed.

## 19. Release-readiness classification

**ALPHA READY**, not BETA READY or STABLE READY. The cross-browser input strategy
and automated regressions are implemented. Beta remains blocked on meaningful
physical iOS/Android evidence, the supported mobile device matrix, and a normal
three-engine run on a current supported environment. No release version or tag
was changed.

## Release follow-up

The current GitHub Actions three-engine run passed on Ubuntu with Playwright
1.63: **94 passed, 8 intentionally skipped Chromium-only cases**, closing the
local frozen-WebKit environment gap. [CI evidence](https://github.com/NIPE-Solutions/react-pull-to-refresh/actions/runs/34019360937).

Desktop feedback also reproduced a website integration issue: short demo
content did not overflow, so auto resolution correctly used Window and refused
pulls after the page scrolled. Hero, Gesture Lab default and Swipe Actions
demos now explicitly select their local surface. Three added browser
regressions cover this scenario. The lab retains automatic mode with an
explanation of short-content behavior. Physical-device QA remains pending.
