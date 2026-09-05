# Browser behavior

## Chrome and Android

Custom document-level pull-to-refresh can conflict with Chrome’s native
refresh. Apply overscroll-behavior-y: contain to the document only when the
application intentionally replaces that behavior. Element roots contain
overscroll locally through core.css.

## Safari and iOS

Safari rubber-banding may expose negative scroll offsets. Boundary detection
treats values up to one CSS pixel, including negatives, as the top. Native
refresh suppression varies across iOS versions; validate the exact layout on
physical devices.

## Firefox

Pointer mechanics and element scrolling are supported. Overscroll visuals
differ from Chromium, so tests target semantic state rather than bounce pixels.

## Desktop and document mode

Primary-button dragging supports demos and automated traces. Automatic
detection falls back to window when no scrolling element is found. The library
never mutates document styles.

## Nested containers

Pass scrollContainer when layout or a third-party component makes ownership
ambiguous. Nested PullToRefresh roots are unsupported in the initial alpha.
