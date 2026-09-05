import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const esm = await import(new URL('../dist/index.js', import.meta.url))
const require = createRequire(import.meta.url)
const cjs = require(
  fileURLToPath(new URL('../dist/index.cjs', import.meta.url)),
)

assert.deepEqual(Object.keys(esm).sort(), ['PullToRefresh'])
assert.deepEqual(Object.keys(cjs).sort(), ['PullToRefresh'])
assert.deepEqual(Object.keys(esm.PullToRefresh).sort(), [
  'Content',
  'Indicator',
  'Root',
])
console.log('Public API verified')
