# Changelog

All notable changes follow Keep a Changelog.

## [Unreleased]

### Changed

- Delayed pointer capture until downward intent and the scroll boundary are
  confirmed.
- Added live pull metrics, lifecycle stress controls, browser guidance, and
  published-package integration proofs to the documentation site.
- Preserved the upward touch-pan direction at the top boundary so scrollable
  content can begin scrolling normally from its first row.

## [0.1.0-alpha.0] - 2026-09-05

### Added

- Compound API with customizable indicator and content.
- Scroll arbitration, resistance, threshold hysteresis, and async lifecycle.
- ESM, CommonJS, TypeScript, and CSS package exports.
- Documentation site, browser guidance, package checks, and QA matrix.
