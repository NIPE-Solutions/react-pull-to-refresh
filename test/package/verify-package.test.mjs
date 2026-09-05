import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import test from 'node:test'
import { createRequire } from 'node:module'

const execFileAsync = promisify(execFile)

test('packed package exposes import, require, types, CSS, and SSR', async () => {
  const workspace = await mkdtemp(join(tmpdir(), 'react-ptr-package-'))
  try {
    const { stdout } = await execFileAsync(
      'npm',
      ['pack', '--json', '--pack-destination', workspace],
      { cwd: new URL('../..', import.meta.url) },
    )
    const [{ filename, files }] = JSON.parse(stdout)
    const names = files.map((file) => file.path)
    for (const required of [
      'dist/index.js',
      'dist/index.cjs',
      'dist/index.d.ts',
      'dist/core.css',
      'dist/theme.css',
      'package.json',
    ]) {
      assert.ok(names.includes(required), 'tarball is missing ' + required)
    }

    await execFileAsync('npm', ['init', '--yes'], { cwd: workspace })
    await execFileAsync(
      'npm',
      [
        'install',
        '--ignore-scripts',
        join(workspace, filename),
        'react@19',
        'react-dom@19',
      ],
      { cwd: workspace },
    )
    const packageDir = join(
      workspace,
      'node_modules',
      '@nipe-solutions',
      'react-pull-to-refresh',
    )
    const imported = await import(join(packageDir, 'dist/index.js'))
    const require = createRequire(import.meta.url)
    const required = require(join(packageDir, 'dist/index.cjs'))
    assert.ok(imported.PullToRefresh.Root)
    assert.ok(required.PullToRefresh.Root)

    const declarations = await readFile(
      join(packageDir, 'dist/index.d.ts'),
      'utf8',
    )
    assert.match(declarations, /PullToRefreshRootProps/)

    const React = await import(join(workspace, 'node_modules/react/index.js'))
    const { renderToString } = await import(
      join(workspace, 'node_modules/react-dom/server.node.js')
    )
    const html = renderToString(
      React.createElement(
        imported.PullToRefresh.Root,
        { onRefresh() {} },
        React.createElement(
          imported.PullToRefresh.Content,
          null,
          'SSR content',
        ),
      ),
    )
    assert.match(html, /data-state="idle"/)
    assert.match(html, /SSR content/)
  } finally {
    await rm(workspace, { recursive: true, force: true })
  }
})
