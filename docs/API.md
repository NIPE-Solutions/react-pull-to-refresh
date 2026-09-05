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
Resolution and rejection both enter settling. Rejections are reported to the
console so they are not silent; application error UI, retry, and cancellation
remain outside the library.

## Motion

Finger travel is direct until the threshold. Overshoot follows a sublinear
power curve, remaining continuous and monotonic while adding resistance.
Refreshing holds at 52 pixels. Settling uses a 220 ms ease-out and becomes
effectively immediate under reduced motion.
