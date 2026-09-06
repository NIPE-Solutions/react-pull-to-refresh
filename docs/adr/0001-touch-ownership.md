# ADR 0001: browser-aware input ownership

Status: implemented; mobile physical validation pending (2026-09-06).

The old `pan-x pan-up` rule allowed the wrong native direction. Pointer Events
Level 3 explicitly uses `pan-x pan-down` for a top-boundary PTR example. The
keywords describe allowed panning, not intuitive finger travel: pan-down allows
scrolling down with the finger moving up. A trusted Chromium CDP trace confirmed
that pan-up cancelled the downward pointer stream; pan-down retained it.

Decision: Pointer Events plus `pan-x pan-down pinch-zoom` where supported. Keep
pinch zoom available. Else keep `auto` and route candidate Touch Events into the
same mechanics. Never prevent touchstart; prevent touchmove only after downward
claim while cancelable. Avoid global document cancellation and UA detection.

The Chromium trace also exposed implicit child capture transferring to Root:
`lostpointercapture` bubbles from the child. Only loss on Root itself cancels the
root session. Pointer cancel, real root capture loss, blur, multi-touch, disable,
and unmount clean up the session.

Alternatives rejected: pan-y alone cannot reserve downward touch for Pointer
Events; pan-x/none would block ordinary upward scrolling; permanent document
non-passive handlers impose global policy; two independent gesture engines
would duplicate lifecycle and threshold rules.

Compatibility data reports all four directional values (`pan-up`, `pan-down`,
`pan-left`, `pan-right`) in Chromium since 55, but not Firefox or Safari/WebKit.
`CSS.supports` accurately distinguishes the tested engines' accepted syntax;
it cannot certify native mobile gesture behavior. Native iOS page refresh is
not guaranteed suppressible. The fallback must pass physical QA before beta.

Sources checked 2026-09-06:

- [Pointer Events Level 3: touch-action details and PTR example](https://www.w3.org/TR/pointerevents3/#details-of-touch-action-values)
- [Pointer Events: ancestor intersection and immutable gesture policy](https://www.w3.org/TR/pointerevents3/#determining-supported-direct-manipulation-behavior)
- [MDN browser compatibility data, touch-action](https://github.com/mdn/browser-compat-data/blob/main/css/properties/touch-action.json)
- [CSS Overflow: clip versus hidden](https://www.w3.org/TR/css-overflow-3/#valdef-overflow-clip)

Automated Chromium touch and forced-fallback tests are browser-engine evidence,
not a claim about physical Safari or Firefox Android. See REAL_DEVICE_QA.md.
