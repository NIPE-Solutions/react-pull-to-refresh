import { copyFile, mkdir } from 'node:fs/promises'

await mkdir(new URL('../dist/', import.meta.url), { recursive: true })
await Promise.all(
  ['core.css', 'theme.css', 'styles.css'].map((file) =>
    copyFile(
      new URL(`../src/${file}`, import.meta.url),
      new URL(`../dist/${file}`, import.meta.url),
    ),
  ),
)
