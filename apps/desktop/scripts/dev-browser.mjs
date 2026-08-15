#!/usr/bin/env node

import { spawn, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const DESKTOP_ROOT = path.resolve(import.meta.dirname, '..')
const REPO_ROOT = path.resolve(DESKTOP_ROOT, '..', '..')
const BACKEND_URL = 'http://127.0.0.1:9121'
const BROWSER_URL = 'http://127.0.0.1:5174'
const SESSION_TOKEN = 'hermes-cursor-local'
const ownedChildren = new Set()
let shuttingDown = false

const pythonCandidates = () => {
  const executable = process.platform === 'win32' ? 'python.exe' : 'python'
  const venvDir = process.platform === 'win32' ? 'Scripts' : 'bin'

  return [
    process.env.VIRTUAL_ENV && path.join(process.env.VIRTUAL_ENV, venvDir, executable),
    path.join(REPO_ROOT, '.venv', venvDir, executable),
    path.join(REPO_ROOT, 'venv', venvDir, executable),
    path.join(os.homedir(), '.hermes', 'hermes-agent', 'venv', venvDir, executable),
    process.platform === 'win32' ? 'python' : 'python3',
    'python'
  ].filter(Boolean)
}

function findHermesPython() {
  for (const candidate of pythonCandidates()) {
    if (candidate.includes(path.sep) && !fs.existsSync(candidate)) continue

    const probe = spawnSync(candidate, ['-c', 'import fastapi, uvicorn, yaml'], {
      cwd: REPO_ROOT,
      stdio: 'ignore'
    })

    if (probe.status === 0) return candidate
  }

  throw new Error(
    'Could not find a Hermes Python environment. Create .venv, or install the project so ~/.hermes/hermes-agent/venv exists.'
  )
}

function startOwned(command, args, options = {}) {
  const child = spawn(command, args, {
    ...options,
    detached: process.platform !== 'win32',
    stdio: 'inherit'
  })

  ownedChildren.add(child)
  child.once('exit', code => {
    ownedChildren.delete(child)
    if (!shuttingDown) {
      console.error(`\n${path.basename(command)} stopped unexpectedly (exit ${code ?? 'signal'}).`)
      void shutdown(1)
    }
  })

  return child
}

function stopChild(child, force = false) {
  if (!child.pid || child.exitCode !== null) return

  try {
    if (process.platform === 'win32') {
      spawnSync('taskkill', ['/pid', String(child.pid), '/t', ...(force ? ['/f'] : [])], { stdio: 'ignore' })
    } else {
      process.kill(-child.pid, force ? 'SIGKILL' : 'SIGTERM')
    }
  } catch {
    child.kill(force ? 'SIGKILL' : 'SIGTERM')
  }
}

async function shutdown(exitCode = 0) {
  if (shuttingDown) return
  shuttingDown = true
  const children = [...ownedChildren]
  const exited = Promise.all(
    children.map(
      child =>
        new Promise(resolve => {
          if (child.exitCode !== null) resolve()
          else child.once('exit', resolve)
        })
    )
  )

  for (const child of children) stopChild(child)
  await Promise.race([exited, new Promise(resolve => setTimeout(resolve, 3_000))])
  for (const child of children) stopChild(child, true)
  await Promise.race([exited, new Promise(resolve => setTimeout(resolve, 1_000))])
  process.exit(exitCode)
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 1_000) {
  const signal = AbortSignal.timeout(timeoutMs)
  return fetch(url, { ...options, signal })
}

async function backendState() {
  try {
    const response = await fetchWithTimeout(`${BACKEND_URL}/api/logs?lines=1`, {
      headers: { 'X-Hermes-Session-Token': SESSION_TOKEN }
    })
    return response.ok ? 'ready' : 'occupied'
  } catch {
    return 'down'
  }
}

async function rendererState() {
  try {
    const response = await fetchWithTimeout(BROWSER_URL)
    const html = await response.text()
    return response.ok && html.includes('/src/main.tsx') ? 'ready' : 'occupied'
  } catch {
    return 'down'
  }
}

async function waitUntil(label, check, timeoutMs = 60_000) {
  const deadline = Date.now() + timeoutMs

  while (Date.now() < deadline) {
    const state = await check()
    if (state === 'ready') return
    if (state === 'occupied') throw new Error(`${label} port is already used by another process.`)
    await new Promise(resolve => setTimeout(resolve, 250))
  }

  throw new Error(`${label} did not become ready within ${Math.round(timeoutMs / 1_000)} seconds.`)
}

function openBrowser(url) {
  const command = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'cmd' : 'xdg-open'
  const args = process.platform === 'win32' ? ['/c', 'start', '', url] : [url]
  const opener = spawn(command, args, { detached: true, stdio: 'ignore' })
  opener.unref()
}

async function main() {
  process.once('SIGINT', () => void shutdown())
  process.once('SIGTERM', () => void shutdown())
  process.once('exit', () => {
    for (const child of ownedChildren) stopChild(child, true)
  })

  const initialBackend = await backendState()
  if (initialBackend === 'occupied') throw new Error('Port 9121 is already used by another process.')
  if (initialBackend === 'down') {
    const python = findHermesPython()
    console.log(`Starting Hermes backend with ${python}...`)
    startOwned(python, ['-m', 'hermes_cli.main', 'serve', '--host', '127.0.0.1', '--port', '9121', '--no-open'], {
      cwd: REPO_ROOT,
      env: {
        ...process.env,
        HERMES_DASHBOARD_SESSION_TOKEN: SESSION_TOKEN,
        HERMES_LAUNCHER_PID: String(process.pid)
      }
    })
    await waitUntil('Hermes backend', backendState)
  } else {
    console.log('Reusing Hermes backend on port 9121.')
  }

  const initialRenderer = await rendererState()
  if (initialRenderer === 'occupied') throw new Error('Port 5174 is already used by another process.')
  if (initialRenderer === 'down') {
    console.log('Starting Cursor-style browser UI...')
    const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm'
    startOwned(npm, ['run', 'dev:renderer'], { cwd: DESKTOP_ROOT, env: process.env })
    await waitUntil('Browser UI', rendererState)
  } else {
    console.log('Reusing browser UI on port 5174.')
  }

  console.log(`\nReady: ${BROWSER_URL}`)
  openBrowser(BROWSER_URL)

  if (ownedChildren.size === 0) return
  console.log('Press Ctrl+C to stop the browser UI and backend.')
  await new Promise(() => undefined)
}

main().catch(async error => {
  console.error(`\nCould not start browser mode: ${error instanceof Error ? error.message : String(error)}`)
  await shutdown(1)
})
