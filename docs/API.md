# API reference

## State model

```text
idle → pending → pulling ⇄ armed → refreshing → settling → idle
                    └────────────→ settling → idle
```

Disabled cancels an uncommitted session. A committed refresh remains committed
if disabled changes while its promise is pending.

## Async lifecycle

onRefresh is invoked synchronously and exactly once on an armed release. A
returned promise holds refreshing; void settles on the next microtask.
Resolution, rejection and synchronous throw all enter settling. The library
does not log consumer errors, show error UI, retry, or cancel the application
promise. Handle application errors in your refresh function. Unmount removes
listeners and prevents UI updates from later promise completion.

## Motion

Finger travel is direct until the threshold. Overshoot follows a sublinear
power curve, remaining continuous and monotonic while adding resistance.
Refreshing holds at the minimum of 52 pixels, the gesture threshold and the
released distance; release never adds extra pull. The internal 52px hold is a
presentation convention, so size indicator content accordingly. Settling uses a 220 ms ease-out and becomes
effectively immediate under reduced motion.

## Threshold and scroll container

Threshold must be finite and greater than zero. Intent still requires six pixels
of movement; armed hysteresis is min(6px, threshold × 0.25). Threshold is snapped
at gesture start, so rerenders cannot change an active gesture.

scrollContainer accepts an HTMLElement, Window, or element ref. A null explicit
ref leaves the owner unresolved and PTR ineligible until a later gesture resolves
it. Automatic detection requires actual vertical overflow and runs at gesture
start. Nested scroll descendants participate in ownership even with an explicit
outer owner. See [Browser Behavior](BROWSER_BEHAVIOR.md).

Editing controls and contenteditable origins are ignored. Mark custom gesture
surfaces with `data-pull-to-refresh-ignore` to opt out of initiation.
