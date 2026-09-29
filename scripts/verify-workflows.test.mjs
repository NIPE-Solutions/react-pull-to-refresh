import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { parse } from 'yaml'
import {
  assertRegistryVersionAbsent,
  parseArguments,
  validatePackedFiles,
  validateReleaseMetadata,
  validateRepositoryContext,
  writeArtifactChecksum,
} from './verify-release.mjs'

const repositoryRoot = path.resolve(import.meta.dirname, '..')
const stablePackage = {
  name: '@nipe-solutions/react-pull-to-refresh',
  version: '1.0.0',
  repository: {
    type: 'git',
    url: 'git+https://github.com/NIPE-Solutions/react-pull-to-refresh.git',
  },
  publishConfig: { access: 'public', provenance: true, tag: 'latest' },
}
const stableChangelog = '## [1.0.0] - 2026-09-29\n'
const releaseTarball = 'nipe-solutions-react-pull-to-refresh-1.0.0.tgz'

test('stable release metadata returns the latest channel', () => {
  assert.deepEqual(validateReleaseMetadata(stablePackage, stableChangelog), {
    name: stablePackage.name,
    version: '1.0.0',
    channel: 'latest',
  })
})

test('repository metadata satisfies the stable release policy', async () => {
  const packageJson = JSON.parse(
    await readFile(path.join(repositoryRoot, 'package.json'), 'utf8'),
  )
  const changelog = await readFile(
    path.join(repositoryRoot, 'CHANGELOG.md'),
    'utf8',
  )

  assert.deepEqual(validateReleaseMetadata(packageJson, changelog), {
    name: stablePackage.name,
    version: '1.0.0',
    channel: 'latest',
  })
})

test('normal quality gate includes workflow policy without release access', async () => {
  const packageJson = JSON.parse(
    await readFile(path.join(repositoryRoot, 'package.json'), 'utf8'),
  )

  assert.match(packageJson.scripts.check, /npm run test:workflows/)
  assert.doesNotMatch(packageJson.scripts.check, /release:check/)
})

test('stable metadata rejects invalid versions and incomplete release records', () => {
  for (const version of ['1.0.0-alpha.1', '1.0.0+build.1', '01.0.0', '1.0']) {
    assert.throws(
      () =>
        validateReleaseMetadata(
          { ...stablePackage, version },
          `## [${version}] - 2026-09-29\n`,
        ),
      /stable semantic version/,
    )
  }

  const invalidCases = [
    [{ ...stablePackage, name: '@example/wrong' }, stableChangelog],
    [
      {
        ...stablePackage,
        repository: { type: 'git', url: 'https://example.com/wrong' },
      },
      stableChangelog,
    ],
    [
      {
        ...stablePackage,
        publishConfig: { ...stablePackage.publishConfig, access: 'restricted' },
      },
      stableChangelog,
    ],
    [
      {
        ...stablePackage,
        publishConfig: { ...stablePackage.publishConfig, provenance: false },
      },
      stableChangelog,
    ],
    [
      {
        ...stablePackage,
        publishConfig: { ...stablePackage.publishConfig, tag: 'alpha' },
      },
      stableChangelog,
    ],
    [stablePackage, '## [Unreleased]\n'],
  ]

  for (const [packageJson, changelog] of invalidCases) {
    assert.throws(() => validateReleaseMetadata(packageJson, changelog))
  }
})

test('repository context requires an exact GitHub release tag', () => {
  const validContext = {
    branch: '',
    dirtyEntries: [],
    dryRun: true,
    githubActions: true,
    eventName: 'release',
    refName: 'v1.0.0',
    refType: 'tag',
    version: '1.0.0',
  }

  assert.deepEqual(validateRepositoryContext(validContext), [])
  assert.throws(
    () => validateRepositoryContext({ ...validContext, refName: '1.0.0' }),
    /must exactly match/,
  )
  assert.throws(
    () =>
      validateRepositoryContext({ ...validContext, refName: 'v1.0.0-alpha.1' }),
    /must exactly match/,
  )
  assert.throws(
    () =>
      validateRepositoryContext({
        ...validContext,
        dirtyEntries: [' M package.json'],
      }),
    /must be clean/,
  )
})

test('local release inspection is dry-run only', () => {
  const messages = validateRepositoryContext({
    branch: 'release/stable-1.0.0',
    dirtyEntries: [' M package.json'],
    dryRun: true,
    githubActions: false,
    version: '1.0.0',
  })
  assert.equal(messages.length, 2)
  assert.throws(
    () =>
      validateRepositoryContext({
        branch: 'main',
        dirtyEntries: [],
        dryRun: false,
        githubActions: false,
        version: '1.0.0',
      }),
    /dry-run only/,
  )
})

test('registry and packed-file guards reject duplicate or altered artifacts', () => {
  assert.doesNotThrow(() => assertRegistryVersionAbsent(undefined, '1.0.0'))
  assert.throws(
    () => assertRegistryVersionAbsent('1.0.0', '1.0.0'),
    /already exists/,
  )

  assert.doesNotThrow(() =>
    validatePackedFiles(
      ['package.json', 'dist/index.js'],
      ['dist/index.js', 'package.json'],
    ),
  )
  assert.throws(
    () =>
      validatePackedFiles(
        ['package.json', 'dist/index.js', 'src/internal.ts'],
        ['package.json', 'dist/index.js'],
      ),
    /Unexpected packed files: src\/internal\.ts/,
  )
  assert.throws(
    () =>
      validatePackedFiles(['package.json'], ['dist/index.js', 'package.json']),
    /Missing packed files: dist\/index\.js/,
  )
})

test('release arguments and checksum output are deterministic', async () => {
  assert.deepEqual(parseArguments(['--dry-run']), {
    dryRun: true,
    outputDirectory: undefined,
  })
  assert.deepEqual(parseArguments(['--dry-run', '--output', 'artifact']), {
    dryRun: true,
    outputDirectory: 'artifact',
  })
  assert.throws(() => parseArguments([]), /Usage:/)
  assert.throws(() => parseArguments(['--publish']), /Usage:/)

  const directory = await mkdtemp(path.join(tmpdir(), 'ptr-checksum-'))
  const tarball = path.join(directory, releaseTarball)
  try {
    await writeFile(tarball, 'verified artifact\n')
    const { checksumPath, digest } = await writeArtifactChecksum(tarball)
    const manifest = await readFile(checksumPath, 'utf8')
    assert.match(digest, /^[a-f0-9]{128}$/)
    assert.equal(manifest, `${digest}  ${releaseTarball}\n`)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test('quality and browser workflows enforce the supported CI matrix', async () => {
  validateQualityWorkflow(await readWorkflow('.github/workflows/quality.yml'))
  validateBrowserWorkflow(await readWorkflow('.github/workflows/browsers.yml'))
})

test('release workflow separates verification from protected publication', async () => {
  validateReleaseWorkflow(await readWorkflow('.github/workflows/release.yml'))
})

test('release workflow validator rejects weakened trust boundaries', async () => {
  const workflow = await readWorkflow('.github/workflows/release.yml')
  const mutations = [
    (copy) => (copy.on.release.types = ['created']),
    (copy) => (copy.permissions = { 'id-token': 'write' }),
    (copy) => (copy.concurrency.group = 'release-${{ github.ref }}'),
    (copy) => (copy.jobs.publish.environment = 'unprotected'),
    (copy) => (copy.jobs.publish.permissions = { contents: 'write' }),
    (copy) => copy.jobs.publish.steps.unshift({ uses: 'actions/checkout@v7' }),
    (copy) => {
      const upload = copy.jobs.verify.steps.find((step) =>
        step.uses?.startsWith('actions/upload-artifact@'),
      )
      upload.with.name = 'different-artifact'
    },
    (copy) => {
      const finalStep = copy.jobs.publish.steps.at(-1)
      finalStep.run = finalStep.run.replaceAll('latest', 'alpha')
    },
    (copy) => {
      const finalStep = copy.jobs.publish.steps.at(-1)
      finalStep.run = finalStep.run.replace(
        releaseTarball,
        'nipe-solutions-react-pull-to-refresh-1.0.1.tgz',
      )
    },
  ]

  for (const mutate of mutations) {
    const copy = structuredClone(workflow)
    mutate(copy)
    assert.throws(() => validateReleaseWorkflow(copy))
  }
})

async function readWorkflow(relativePath) {
  return parse(await readFile(path.join(repositoryRoot, relativePath), 'utf8'))
}

function stepsFor(job) {
  assert.ok(Array.isArray(job?.steps), 'job must define executable steps')
  return job.steps
}

function runCommands(job) {
  return stepsFor(job)
    .map((step) => step.run)
    .filter((command) => typeof command === 'string')
}

function assertPinnedActions(workflow) {
  for (const job of Object.values(workflow.jobs)) {
    for (const step of stepsFor(job)) {
      if (step.uses) {
        assert.match(
          step.uses,
          /^[\w.-]+\/[\w.-]+@v\d+$/,
          `${step.uses} must use an explicit major action version`,
        )
      }
    }
  }
}

function assertCommonWorkflowPolicy(workflow) {
  assert.deepEqual(workflow.permissions, { contents: 'read' })
  assertPinnedActions(workflow)
  assert.equal(workflow.concurrency['cancel-in-progress'], true)
}

function validateQualityWorkflow(workflow) {
  assertCommonWorkflowPolicy(workflow)
  assert.equal(workflow.concurrency.group, 'quality-${{ github.ref }}')
  assert.deepEqual(Object.keys(workflow.jobs), ['check'])
  const job = workflow.jobs.check
  assert.equal(job['runs-on'], 'ubuntu-24.04')
  assert.ok(job['timeout-minutes'] <= 30)
  const setupNode = stepsFor(job).find((step) =>
    step.uses?.startsWith('actions/setup-node@'),
  )
  assert.equal(String(setupNode?.with?.['node-version']), '24')
  assert.equal(setupNode?.with?.cache, 'npm')
  assert.deepEqual(runCommands(job), ['npm ci', 'npm run check'])
}

function validateBrowserWorkflow(workflow) {
  assertCommonWorkflowPolicy(workflow)
  assert.equal(workflow.concurrency.group, 'browsers-${{ github.ref }}')
  assert.deepEqual(Object.keys(workflow.jobs).sort(), [
    'chromium',
    'firefox',
    'webkit',
  ])

  for (const browser of ['chromium', 'firefox', 'webkit']) {
    const job = workflow.jobs[browser]
    assert.equal(job['runs-on'], 'ubuntu-24.04')
    assert.ok(job['timeout-minutes'] <= 30)
    const commands = runCommands(job)
    assert.ok(commands.includes('npm ci'))
    assert.ok(
      commands.includes(`npx playwright install --with-deps ${browser}`),
    )
    assert.ok(
      commands.includes(
        `npm run test:e2e -- --project=${browser} --reporter=line,html`,
      ),
    )
    const artifact = stepsFor(job).find((step) =>
      step.uses?.startsWith('actions/upload-artifact@'),
    )
    assert.equal(artifact?.if, 'failure()')
    assert.equal(artifact?.with?.name, `playwright-${browser}`)
    assert.match(artifact?.with?.path ?? '', /playwright-report/)
    assert.match(artifact?.with?.path ?? '', /test-results/)
    assert.equal(artifact?.with?.['if-no-files-found'], 'ignore')
    assert.ok(artifact?.with?.['retention-days'] <= 7)
  }
}

function validateReleaseWorkflow(workflow) {
  assert.deepEqual(workflow.permissions, { contents: 'read' })
  assertPinnedActions(workflow)
  assert.deepEqual(workflow.on, { release: { types: ['published'] } })
  assert.equal(
    workflow.concurrency.group,
    'npm-nipe-solutions-react-pull-to-refresh-stable',
  )
  assert.equal(workflow.concurrency['cancel-in-progress'], false)

  const verify = workflow.jobs.verify
  const publish = workflow.jobs.publish
  assert.ok(verify)
  assert.ok(publish)
  assert.equal(verify['runs-on'], 'ubuntu-24.04')
  assert.ok(verify['timeout-minutes'] <= 60)
  assert.deepEqual(verify.outputs, {
    tarball: '${{ steps.release.outputs.tarball }}',
    channel: '${{ steps.release.outputs.channel }}',
  })

  const verifyCommands = runCommands(verify)
  assert.ok(verifyCommands.includes('npm ci'))
  assert.ok(verifyCommands.includes('npm run check'))
  assert.ok(
    verifyCommands.includes(
      'npx playwright install --with-deps chromium firefox webkit',
    ),
  )
  assert.ok(verifyCommands.includes('npm run test:e2e'))
  assert.ok(
    verifyCommands.includes(
      'npm run release:check -- --dry-run --output release-artifact',
    ),
  )
  const releaseStep = stepsFor(verify).find((step) => step.id === 'release')
  const upload = stepsFor(verify).find((step) =>
    step.uses?.startsWith('actions/upload-artifact@'),
  )
  assert.ok(releaseStep)
  assert.equal(upload?.with?.name, 'npm-package-stable')
  assert.equal(upload?.with?.path, 'release-artifact')
  assert.equal(upload?.with?.['if-no-files-found'], 'error')
  assert.ok(upload?.with?.['retention-days'] <= 3)
  assert.ok(
    stepsFor(verify).indexOf(upload) > stepsFor(verify).indexOf(releaseStep),
  )

  assert.equal(publish.needs, 'verify')
  assert.equal(publish.environment, 'npm')
  assert.equal(publish['runs-on'], 'ubuntu-24.04')
  assert.ok(publish['timeout-minutes'] <= 10)
  assert.deepEqual(publish.permissions, { 'id-token': 'write' })
  const publishSteps = stepsFor(publish)
  assert.equal(
    publishSteps.some((step) => step.uses?.startsWith('actions/checkout@')),
    false,
  )
  assert.equal(
    runCommands(publish).some((command) => /npm (ci|install)/.test(command)),
    false,
  )

  const setupNode = publishSteps.find((step) =>
    step.uses?.startsWith('actions/setup-node@'),
  )
  assert.equal(String(setupNode?.with?.['node-version']), '24')
  assert.equal(setupNode?.with?.['registry-url'], 'https://registry.npmjs.org')
  assert.equal(setupNode?.with?.cache, undefined)
  const download = publishSteps.find((step) =>
    step.uses?.startsWith('actions/download-artifact@'),
  )
  assert.equal(download?.with?.name, 'npm-package-stable')
  assert.equal(download?.with?.path, 'release-artifact')

  const finalStep = publishSteps.at(-1)
  assert.equal(finalStep.name, 'Validate and publish verified artifact')
  assert.equal(
    finalStep.env.RELEASE_TARBALL,
    '${{ needs.verify.outputs.tarball }}',
  )
  assert.equal(
    finalStep.env.RELEASE_CHANNEL,
    '${{ needs.verify.outputs.channel }}',
  )
  assert.match(finalStep.run, /RELEASE_CHANNEL" != "latest"/)
  assert.match(finalStep.run, new RegExp(releaseTarball.replaceAll('.', '\\.')))
  assert.match(finalStep.run, /sha512sum --check --strict/)
  assert.match(finalStep.run, /manifests=\(\*\.sha512\)/)
  assert.match(finalStep.run, /\$\{#manifests\[@\]\} != 1/)
  assert.equal((finalStep.run.match(/npm publish/g) ?? []).length, 1)
  assert.match(
    finalStep.run,
    /npm publish --ignore-scripts --provenance --access public --tag "\$RELEASE_CHANNEL" -- "\$RELEASE_TARBALL"/,
  )
}
