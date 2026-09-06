import assert from 'node:assert/strict'
import { gzipSync } from 'node:zlib'
import { readFile, stat } from 'node:fs/promises'

const js = await readFile(new URL('../dist/index.js', import.meta.url))
const coreCss = await readFile(new URL('../dist/core.css', import.meta.url))
const gzipBytes = gzipSync(js).byteLength

// Browser adapters and origin-aware ownership add ~0.85 kB over the 2.19 kB baseline.
assert.ok(gzipBytes <= 3_200, 'ESM gzip exceeds 3200 bytes: ' + gzipBytes)
assert.ok(coreCss.byteLength <= 3_000, 'core.css exceeds 3000 bytes')
const declaration = await stat(new URL('../dist/index.d.ts', import.meta.url))
assert.ok(declaration.size > 0, 'Type declarations are empty')
console.log(
  'Bundle budget verified: ' +
    gzipBytes +
    ' B gzip JS, ' +
    coreCss.byteLength +
    ' B core CSS',
)
