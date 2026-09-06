# Architecture and test boundaries

```text
Pointer adapter (directional touch, mouse, pen)
Touch adapter (directional values unsupported)
                    ↓
start snapshot: origin, owner, adapter, coordinates, threshold
                    ↓
shared intent: 6px slop → axis/direction arbitration
                    ↓
recheck same owner + entire relevant top boundary chain
                    ↓
claim → shared resistance → pulling ⇄ armed
                    ↓
release once → application onRefresh → refreshing
                    ↓
resolve / reject / synchronous throw → settling → idle or disabled
```

Scroll ownership lives in `src/scroll-ownership.ts`. Root does not acquire
scroll ownership by adding mechanical overflow. The root/ancestor owner is
resolved at start; origin descendants are checked for competing scroll
consumers. Invalid explicit refs remain unresolved. Browser-owned gestures are
never resumed mid-stream.

`src/mechanics.ts` owns intent, resistance, progress and hysteresis. Visual travel
remains direct through the threshold and sublinear above it. Hysteresis is
`min(6, threshold * 0.25)`; every finite positive threshold is valid. The 6px
intent slop still applies even for threshold 4. Armed release holds at
`min(52, session threshold, released distance)`. The internal 52px resting height
is an indicator presentation convention, not a measured height or public prop.
Applications should size their indicator for this hold; small thresholds imply
smaller available space. Progress remains 1 during refreshing and returns to 0
when settling begins, independent of promise success/failure.

Session listeners are removed before release/abandonment; cleanup releases root
capture only after clearing session state so capture-loss events cannot commit
again. Touch fallback uses one non-passive root touchmove listener during a
candidate only. Session-scoped window end/blur/additional-pointer detection handles
abandonment outside the root. No idle RAF, document touchmove listener, generic
gesture dependency, observer of content mutations, or application promise
cancellation is introduced. React supplies its normal delegated start handlers.

A disabled change cancels an uncommitted session. Committed work finishes, then
settles to disabled. Unmount removes listeners; promise completion is ignored
for UI updates. Application errors are consumed for lifecycle cleanup without
console logging, retries, or a second error callback. Applications retain error
UI and telemetry ownership.

## Verification layers

- Pure mechanics tests: intent, resistance, progress, threshold hysteresis.
- React tests: adapter invariants, null refs, nesting, lifecycle, StrictMode,
  cancellation, editing exclusions, ref/threshold rerenders and listener cleanup.
- Browser tests: computed touch-action, actual overflow geometry, sticky headers,
  Window/element scroll surfaces, dynamic auto ancestors, nesting, large lists,
  console hygiene, and trusted Chromium CDP touch traces.
- Synthetic DOM touch tests: exercise adapter integration in each engine. They
  cannot prove native touch delivery or arbitration.
- Physical-device QA: native overscroll/refresh, selection handles, zoom,
  Safari/Firefox mobile fallback and actual browser chrome interactions.

Directly invoking React handlers or `page.mouse` cannot establish mobile touch
support. Beta requires meaningful physical iOS and Android evidence.

Native listeners route through handlers published at React commit, so owner and
refresh callback changes are observed without resubscribing active sessions.
The threshold remains a gesture-start snapshot. The JS gzip budget is 3,200 B
(previously 3,000 B), allowing the focused compatibility adapter and ownership
checks; the measured baseline before hardening was 2,194 B. Runtime dependencies
remain zero beyond React peers.
