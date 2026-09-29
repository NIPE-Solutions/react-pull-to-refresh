import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import process from 'node:process'
import { promisify } from 'node:util'
import test from 'node:test'

const execFileAsync = promisify(execFile)
const repositoryRoot = path.resolve(import.meta.dirname, '../..')

test('packed file allowlist rejects an unexpected dist file', async () => {
  const unexpectedFile = path.join(repositoryRoot, 'dist/unexpected.tmp')

  try {
    await writeFile(unexpectedFile, 'must not ship\n')
    await assert.rejects(
      execFileAsync(process.execPath, ['scripts/verify-package.mjs'], {
        cwd: repositoryRoot,
        maxBuffer: 10 * 1024 * 1024,
      }),
      (error) => {
        assert.match(
          error.stderr,
          /Unexpected packed files: dist\/unexpected\.tmp/,
        )
        return true
      },
    )
  } finally {
    await rm(unexpectedFile, { force: true })
  }
})

test('packed package passes isolated React 18 and React 19 consumers', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'react-ptr-policy-'))
  const userConfig = path.join(directory, 'npmrc')

  try {
    await writeFile(userConfig, 'allow-scripts=@example/unrelated-tool\n')
    const { stdout, stderr } = await execFileAsync(
      process.execPath,
      ['scripts/verify-package.mjs'],
      {
        cwd: repositoryRoot,
        env: {
          ...process.env,
          NPM_CONFIG_USERCONFIG: userConfig,
          npm_config_allow_scripts: '@example/unrelated-tool',
        },
        maxBuffer: 10 * 1024 * 1024,
      },
    )

    assert.equal(stderr, '')
    assert.match(
      stdout,
      /React 18(?:\.\d+){2}: ESM, CJS, types, CSS, SSR passed/,
    )
    assert.match(
      stdout,
      /React 19(?:\.\d+){2}: ESM, CJS, types, CSS, SSR passed/,
    )
    assert.match(stdout, /Packed package verification passed/)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})
