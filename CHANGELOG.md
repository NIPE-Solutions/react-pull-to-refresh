# Changelog

All notable changes follow Keep a Changelog.

## [Unreleased]

## [0.1.0-alpha.1] - 2026-09-06

### Fixed

- Correct directional touch-action to pan-down and preserve pinch zoom.
- Add session-scoped touch compatibility handling with shared gesture mechanics.
- Ignore bubbled child capture loss when capture transfers to Root.
- Remove unintended root overflow and overscroll containment; preserve sticky and Window scrolling.
- Resolve actual scrollability and nested gesture-origin consumers at gesture start and claim.
- Keep explicit delayed refs unresolved until available.
- Validate finite positive thresholds and scale small-threshold hysteresis.
- Cap refresh hold by threshold and released distance.
- Settle rejected/thrown application refreshes without logging consumer errors.
- Protect editing controls; support data-pull-to-refresh-ignore surfaces.
- Expand browser regressions, touch evidence, fixtures, architecture and physical-device QA documentation.

### Changed

- Delayed pointer capture until downward intent and the scroll boundary are
  confirmed.
- Added live pull metrics, lifecycle stress controls, browser guidance, and
  published-package integration proofs to the documentation site.
- Documented explicit pointer ownership for Pull to Refresh inside a draggable
  bottom sheet.

## [0.1.0-alpha.0] - 2026-09-05

### Added

- Compound API with customizable indicator and content.
- Scroll arbitration, resistance, threshold hysteresis, and async lifecycle.
- ESM, CommonJS, TypeScript, and CSS package exports.
- Documentation site, browser guidance, package checks, and QA matrix.
