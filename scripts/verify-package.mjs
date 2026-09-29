import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import console from 'node:console'
import { createRequire } from 'node:module'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import process from 'node:process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)
const repositoryRoot = path.resolve(import.meta.dirname, '..')
const packageName = '@nipe-solutions/react-pull-to-refresh'
const approvedPackedFiles = JSON.parse(
  await readFile(path.join(import.meta.dirname, 'package-files.json'), 'utf8'),
)
const lanes = [
  { react: '18', reactDom: '18', reactTypes: '18', reactDomTypes: '18' },
  { react: '19', reactDom: '19', reactTypes: '19', reactDomTypes: '19' },
]

const temporaryRoot = await mkdtemp(path.join(tmpdir(), 'react-ptr-package-'))

try {
  const packDirectory = path.join(temporaryRoot, 'pack')
  await mkdir(packDirectory)
  const { stdout } = await run('npm', [
    'pack',
    '--json',
    '--pack-destination',
    packDirectory,
  ])
  const [pack] = JSON.parse(stdout)
  assert.ok(pack, 'npm pack did not report an artifact')
  validatePackedFiles(pack.files.map(({ path: file }) => file))

  const tarballPath = path.join(packDirectory, pack.filename)
  for (const lane of lanes) {
    const consumer = path.join(temporaryRoot, `react-${lane.react}`)
    await mkdir(consumer)
    await writeFile(
      path.join(consumer, 'package.json'),
      `${JSON.stringify({ private: true, type: 'module' }, null, 2)}\n`,
    )

    await run(
      'npm',
      [
        'install',
        '--ignore-scripts',
        '--no-audit',
        '--no-fund',
        '--no-package-lock',
        '--save-exact',
        '--install-strategy=hoisted',
        tarballPath,
        `react@${lane.react}`,
        `react-dom@${lane.reactDom}`,
        `@types/react@${lane.reactTypes}`,
        `@types/react-dom@${lane.reactDomTypes}`,
      ],
      consumer,
    )

    const installedReact = JSON.parse(
      await readFile(
        path.join(consumer, 'node_modules/react/package.json'),
        'utf8',
      ),
    )
    assert.match(
      installedReact.version,
      new RegExp(`^${lane.react}\\.`),
      `React ${lane.react} consumer installed the wrong major`,
    )

    await verifyModulesAndSsr(consumer)
    await verifyTypes(consumer)
    await verifyStyles(consumer)

    console.log(
      `React ${installedReact.version}: ESM, CJS, types, CSS, SSR passed`,
    )
  }

  console.log(
    `Packed package verification passed (${pack.entryCount} files, ${pack.size} bytes)`,
  )
} finally {
  await rm(temporaryRoot, { recursive: true, force: true })
}

function validatePackedFiles(files) {
  const actual = [...files].sort()
  const expected = [...approvedPackedFiles].sort()
  const unexpected = actual.filter((file) => !expected.includes(file))
  const missing = expected.filter((file) => !actual.includes(file))
  const messages = []

  if (unexpected.length > 0) {
    messages.push(`Unexpected packed files: ${unexpected.join(', ')}`)
  }
  if (missing.length > 0) {
    messages.push(`Missing packed files: ${missing.join(', ')}`)
  }

  assert.deepEqual(
    actual,
    expected,
    messages.join('\n') || 'Packed file inventory differs from its allowlist',
  )
}

async function verifyModulesAndSsr(consumer) {
  const esm = await run(
    process.execPath,
    [
      '--input-type=module',
      '--eval',
      `
        import React from 'react'
        import { renderToString } from 'react-dom/server'
        import { PullToRefresh } from '${packageName}'

        assertComponent(PullToRefresh.Root)
        const html = renderToString(
          React.createElement(
            PullToRefresh.Root,
            { onRefresh() {} },
            React.createElement(PullToRefresh.Content, null, 'SSR content'),
          ),
        )
        if (!html.includes('data-state="idle"') || !html.includes('SSR content')) {
          throw new Error('ESM server render did not preserve the public contract')
        }

        function assertComponent(component) {
          if (!component) throw new Error('ESM export is missing PullToRefresh.Root')
        }
      `,
    ],
    consumer,
  )
  assert.equal(esm.stderr, '')

  const cjs = await run(
    process.execPath,
    [
      '--input-type=commonjs',
      '--eval',
      `
        const { PullToRefresh } = require('${packageName}')
        if (!PullToRefresh.Root) {
          throw new Error('CommonJS export is missing PullToRefresh.Root')
        }
      `,
    ],
    consumer,
  )
  assert.equal(cjs.stderr, '')
}

async function verifyTypes(consumer) {
  await writeFile(
    path.join(consumer, 'index.ts'),
    `
      import {
        PullToRefresh,
        type PullToRefreshRootProps,
      } from '${packageName}'

      const props: PullToRefreshRootProps = {
        children: null,
        onRefresh: async () => {},
      }
      void PullToRefresh.Root
      void props
    `,
  )
  await writeFile(
    path.join(consumer, 'tsconfig.json'),
    `${JSON.stringify(
      {
        compilerOptions: {
          module: 'NodeNext',
          moduleResolution: 'NodeNext',
          strict: true,
          noEmit: true,
          skipLibCheck: false,
        },
        include: ['index.ts'],
      },
      null,
      2,
    )}\n`,
  )

  await run(
    process.execPath,
    [
      path.join(repositoryRoot, 'node_modules/typescript/bin/tsc'),
      '--project',
      'tsconfig.json',
    ],
    consumer,
  )
}

async function verifyStyles(consumer) {
  const require = createRequire(path.join(consumer, 'package.json'))
  for (const stylesheet of ['core.css', 'theme.css', 'styles.css']) {
    const stylesheetPath = require.resolve(`${packageName}/${stylesheet}`)
    assert.ok(
      (await readFile(stylesheetPath, 'utf8')).trim().length > 0,
      `${stylesheet} must contain CSS`,
    )
  }
}

function run(command, args, cwd = repositoryRoot) {
  const environment = Object.fromEntries(
    Object.entries(process.env).filter(
      ([name]) => name.toLowerCase() !== 'npm_config_allow_scripts',
    ),
  )
  Object.assign(environment, {
    npm_config_audit: 'false',
    npm_config_fund: 'false',
    npm_config_update_notifier: 'false',
  })

  return execFileAsync(command, args, {
    cwd,
    env: environment,
    maxBuffer: 10 * 1024 * 1024,
  })
}
