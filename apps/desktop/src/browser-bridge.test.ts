import { afterEach, describe, expect, it, vi } from 'vitest'

describe('browser bridge filesystem capabilities', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    Reflect.deleteProperty(window, 'hermesDesktop')
    Reflect.deleteProperty(window, '__HERMES_SESSION_TOKEN__')
    Reflect.deleteProperty(document.documentElement.dataset, 'runtime')
    window.localStorage.removeItem('hermes-desktop-mode-v1')
    document.title = ''
  })

  it('reads a local file data URL through the authenticated filesystem API', async () => {
    const fetch = vi.fn(
      async () =>
        new Response(JSON.stringify({ dataUrl: 'data:text/plain;base64,aGVsbG8=' }), {
          headers: { 'Content-Type': 'application/json' },
          status: 200
        })
    )

    vi.stubGlobal('fetch', fetch)

    Reflect.deleteProperty(window, 'hermesDesktop')
    window.localStorage.removeItem('hermes-desktop-mode-v1')
    vi.resetModules()

    await import('./browser-bridge')

    expect(document.title).toBe('Cursor')
    expect(document.documentElement.dataset.runtime).toBe('browser')
    expect(window.localStorage.getItem('hermes-desktop-mode-v1')).toBe('dark')
    await expect(window.hermesDesktop.readFileDataUrl('/tmp/hello.txt')).resolves.toBe(
      'data:text/plain;base64,aGVsbG8='
    )
    expect(fetch).toHaveBeenCalledWith(
      '/api/fs/read-data-url?path=%2Ftmp%2Fhello.txt',
      expect.objectContaining({
        headers: expect.objectContaining({ 'X-Hermes-Session-Token': 'hermes-cursor-local' })
      })
    )
  })

  it('provides recent logs to the renderer error boundary', async () => {
    const fetch = vi.fn(
      async () =>
        new Response(JSON.stringify({ file: 'agent', lines: ['renderer recovered'] }), {
          headers: { 'Content-Type': 'application/json' },
          status: 200
        })
    )

    vi.stubGlobal('fetch', fetch)

    Reflect.deleteProperty(window, 'hermesDesktop')
    vi.resetModules()

    await import('./browser-bridge')

    await expect(window.hermesDesktop.getRecentLogs()).resolves.toEqual({
      lines: ['renderer recovered'],
      path: 'agent'
    })
    expect(fetch).toHaveBeenCalledWith(
      '/api/logs?lines=200',
      expect.objectContaining({
        headers: expect.objectContaining({ 'X-Hermes-Session-Token': 'hermes-cursor-local' })
      })
    )
  })

  it('uses the ephemeral token injected by the production server', async () => {
    const fetch = vi.fn(
      async () =>
        new Response(JSON.stringify({ file: 'agent', lines: [] }), {
          headers: { 'Content-Type': 'application/json' },
          status: 200
        })
    )

    vi.stubGlobal('fetch', fetch)
    window.__HERMES_SESSION_TOKEN__ = 'ephemeral-production-token'
    Reflect.deleteProperty(window, 'hermesDesktop')
    vi.resetModules()

    await import('./browser-bridge')
    await window.hermesDesktop.getRecentLogs()

    expect(fetch).toHaveBeenCalledWith(
      '/api/logs?lines=200',
      expect.objectContaining({
        headers: expect.objectContaining({ 'X-Hermes-Session-Token': 'ephemeral-production-token' })
      })
    )
  })
})
