/**
 * Browser host for the Cursor-style Hermes UI.
 *
 * The renderer keeps its established `window.hermesDesktop` capability name
 * for compatibility, while this module implements it entirely with browser
 * APIs and the same-origin Hermes backend proxy.
 */

export {}

// Production HTML receives a fresh token from the loopback Hermes server.
// Vite development has no HTML injection, so it uses the fixed token owned by
// scripts/dev-browser.mjs instead.
const TOKEN = window.__HERMES_SESSION_TOKEN__ ?? 'hermes-cursor-local'
const noopOff = () => () => undefined

const terminalSessions = new Map<
  string,
  {
    cwd: string
    dataListeners: Set<(data: string) => void>
    exitListeners: Set<(payload: { code: number | null; signal: string | null }) => void>
    pendingData: string[]
    socket: WebSocket
  }
>()

function wsUrl(): string {
  const scheme = window.location.protocol === 'https:' ? 'wss:' : 'ws:'

  return `${scheme}//${window.location.host}/api/ws?token=${encodeURIComponent(TOKEN)}`
}

function shellWsUrl(options: { cols?: number; cwd?: string; rows?: number }): string {
  const url = new URL(wsUrl())
  url.pathname = '/api/shell'
  url.searchParams.set('cols', String(options.cols ?? 80))
  url.searchParams.set('rows', String(options.rows ?? 24))

  if (options.cwd) {
    url.searchParams.set('cwd', options.cwd)
  }

  return url.toString()
}

function terminalSession(id: string) {
  return terminalSessions.get(id)
}

const terminal = {
  cwd: async (id: string) => terminalSession(id)?.cwd ?? null,
  dispose: async (id: string) => {
    const session = terminalSession(id)

    if (!session) {
      return false
    }
    session.socket.close(1000, 'disposed')

    return true
  },
  onData: (id: string, callback: (data: string) => void) => {
    const session = terminalSession(id)
    const listeners = session?.dataListeners
    listeners?.add(callback)
    session?.pendingData.splice(0).forEach(callback)

    return () => listeners?.delete(callback)
  },
  onExit: (id: string, callback: (payload: { code: number | null; signal: string | null }) => void) => {
    const listeners = terminalSession(id)?.exitListeners
    listeners?.add(callback)

    return () => listeners?.delete(callback)
  },
  resize: async (id: string, size: { cols: number; rows: number }) => {
    const socket = terminalSession(id)?.socket

    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return false
    }
    socket.send(`\u001b[RESIZE:${size.cols};${size.rows}]`)

    return true
  },
  start: async (options: { cols?: number; cwd?: string; rows?: number } = {}) => {
    const id = crypto.randomUUID()
    const socket = new WebSocket(shellWsUrl(options))
    socket.binaryType = 'arraybuffer'

    const session = {
      cwd: options.cwd ?? '',
      dataListeners: new Set<(data: string) => void>(),
      exitListeners: new Set<(payload: { code: number | null; signal: string | null }) => void>(),
      pendingData: [] as string[],
      socket
    }

    terminalSessions.set(id, session)

    socket.addEventListener('message', event => {
      const publish = (data: string) => {
        if (!session.dataListeners.size) {
          session.pendingData.push(data)
        } else {
          session.dataListeners.forEach(listener => listener(data))
        }
      }

      if (typeof event.data === 'string') {
        publish(event.data)
      } else if (event.data instanceof ArrayBuffer) {
        publish(new TextDecoder().decode(event.data))
      } else if (event.data instanceof Blob) {
        void event.data.text().then(publish)
      }
    })
    socket.addEventListener('close', event => {
      terminalSessions.delete(id)
      session.exitListeners.forEach(listener => listener({ code: event.code === 1000 ? 0 : null, signal: null }))
    })
    await new Promise<void>((resolve, reject) => {
      socket.addEventListener('open', () => resolve(), { once: true })
      socket.addEventListener('error', () => reject(new Error('Could not connect to the Hermes shell.')), {
        once: true
      })
    })

    return { cwd: session.cwd, id, shell: navigator.platform.toLowerCase().includes('win') ? 'cmd' : 'shell' }
  },
  write: async (id: string, data: string) => {
    const socket = terminalSession(id)?.socket

    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return false
    }
    socket.send(data)

    return true
  }
}

const fsPath = (endpoint: string, filePath: string) => `/api/fs/${endpoint}?path=${encodeURIComponent(filePath)}`

async function api<T>(request: {
  body?: unknown
  method?: string
  path: string
  timeoutMs?: number
  upload?: { bytes: ArrayBuffer | Uint8Array; contentType?: string; filename?: string }
}): Promise<T> {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), request.timeoutMs ?? 30_000)

  try {
    let body: BodyInit | undefined
    const headers: Record<string, string> = { 'X-Hermes-Session-Token': TOKEN }

    if (request.upload) {
      const data =
        request.upload.bytes instanceof Uint8Array ? request.upload.bytes : new Uint8Array(request.upload.bytes)
      const form = new FormData()
      form.append(
        'file',
        new Blob([data as BlobPart], { type: request.upload.contentType }),
        request.upload.filename ?? 'upload'
      )
      body = form
    } else if (request.body !== undefined) {
      headers['Content-Type'] = 'application/json'
      body = JSON.stringify(request.body)
    }

    const response = await fetch(request.path, {
      method: request.method ?? 'GET',
      headers,
      body,
      signal: controller.signal
    })

    const text = await response.text()

    if (!response.ok) {
      throw new Error(`${response.status}: ${text || response.statusText}`)
    }

    return (text ? JSON.parse(text) : null) as T
  } finally {
    window.clearTimeout(timeout)
  }
}

if (!window.hermesDesktop) {
  // The browser-hosted Agents surface is designed dark-first. Seed the
  // existing appearance preference only on a fresh browser profile so the
  // first render and syntax themes agree; later user choices still win.
  try {
    if (!window.localStorage.getItem('hermes-desktop-mode-v1')) {
      window.localStorage.setItem('hermes-desktop-mode-v1', 'dark')
    }
  } catch {
    // Storage can be unavailable in hardened/private browser contexts.
  }

  document.title = 'Cursor'
  document.documentElement.dataset.runtime = 'browser'

  const connection = {
    baseUrl: window.location.origin,
    isFullscreen: false,
    mode: 'local' as const,
    authMode: 'token' as const,
    nativeOverlayWidth: 0,
    token: TOKEN,
    wsUrl: wsUrl(),
    logs: [],
    windowButtonPosition: null
  }

  const bridge = {
    runtime: 'browser',
    getConnection: async () => connection,
    revalidateConnection: async () => ({ ok: true, rebuilt: false }),
    touchBackend: async () => ({ ok: true }),
    getGatewayWsUrl: async () => ({ ok: true, wsUrl: wsUrl() }),
    getBootProgress: async () => ({
      error: null,
      fakeMode: false,
      message: 'Cursor agent backend is ready',
      phase: 'backend.ready',
      progress: 100,
      running: true,
      timestamp: Date.now()
    }),
    onBootProgress: noopOff,
    onBackendExit: noopOff,
    onPowerResume: noopOff,
    onConnectionApplied: noopOff,
    onWindowStateChanged: noopOff,
    onBatteryChanged: noopOff,
    getOnBattery: async () => false,
    profile: { get: async () => ({ profile: null }), set: async () => ({ profile: null }) },
    api,
    readDir: (filePath: string) => api({ path: fsPath('list', filePath) }),
    readFileText: (filePath: string) => api({ path: fsPath('read-text', filePath) }),
    readFileDataUrl: async (filePath: string) => {
      const result = await api<{ dataUrl?: string } | string>({ path: fsPath('read-data-url', filePath) })

      return typeof result === 'string' ? result : (result.dataUrl ?? '')
    },
    readFileDataUrlForAttach: async (filePath: string) => {
      const result = await api<{ dataUrl?: string } | string>({ path: fsPath('read-data-url', filePath) })

      return typeof result === 'string' ? result : (result.dataUrl ?? '')
    },
    writeTextFile: (filePath: string, content: string) =>
      api({ body: { content, path: filePath }, method: 'POST', path: '/api/fs/write-text' }),
    gitRoot: async (filePath: string) => {
      const result = await api<{ root: string | null }>({ path: fsPath('git-root', filePath) })

      return result.root
    },
    notify: async ({ title, message }: { title?: string; message?: string }) => {
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title ?? 'Cursor', { body: message })
      }

      return true
    },
    claimAmbientCue: async () => true,
    requestMicrophoneAccess: async () => true,
    writeClipboard: async (text: string) => {
      await navigator.clipboard.writeText(text)

      return true
    },
    readClipboard: async () => navigator.clipboard.readText(),
    getPathForFile: () => '',
    openExternal: async (url: string) => {
      window.open(url, '_blank', 'noopener,noreferrer')
    },
    openPreviewInBrowser: async (url: string) => {
      window.open(url, '_blank', 'noopener,noreferrer')
    },
    fetchLinkTitle: async (url: string) => url,
    sanitizeWorkspaceCwd: async (cwd?: string | null) => ({ cwd: cwd ?? '', sanitized: false }),
    setActiveWork: () => undefined,
    setTitleBarTheme: () => undefined,
    setNativeTheme: () => undefined,
    setTranslucency: () => undefined,
    setKeepAwake: () => undefined,
    getBootstrapState: async () => ({
      active: false,
      manifest: null,
      stages: {},
      error: null,
      log: [],
      startedAt: null,
      completedAt: null,
      setupChoice: null,
      unsupportedPlatform: null
    }),
    onBootstrapEvent: noopOff,
    getVersion: async () => ({
      appVersion: 'browser',
      electronVersion: '',
      nodeVersion: '',
      platform: navigator.platform,
      hermesRoot: ''
    }),
    settings: {
      getDefaultProjectDir: async () => ({ defaultLabel: 'Home', dir: null, resolvedCwd: '' }),
      setDefaultProjectDir: async (dir: string | null) => ({ dir }),
      pickDefaultProjectDir: async () => ({ canceled: true, dir: null })
    },
    terminal,
    zoom: { get: async () => ({ level: 0, percent: 100 }), setPercent: () => undefined, onChanged: noopOff },
    getRecentLogs: async () => {
      const result = await api<{ file?: string; lines?: string[] }>({ path: '/api/logs?lines=200' })

      return { path: result.file ?? 'agent', lines: result.lines ?? [] }
    },
    revealLogs: async () => {
      window.open('/api/logs?lines=200', '_blank', 'noopener,noreferrer')

      return { ok: true, path: '/api/logs?lines=200' }
    },
    quickEntry: {
      dismiss: () => undefined,
      getSettings: async () => ({ enabled: false, error: null, registered: false, shortcut: '' }),
      onShown: noopOff,
      onState: noopOff,
      onSubmit: noopOff,
      pushState: () => undefined,
      setSettings: async () => ({ enabled: false, error: null, registered: false, shortcut: '' }),
      submit: () => undefined
    },
    wakeIndicator: { getState: async () => 'hidden', setState: () => undefined, onState: noopOff },
    updates: {
      check: async () => ({ supported: false }),
      apply: async () => ({ ok: false }),
      getBranch: async () => ({ branch: 'cursor-ui' }),
      setBranch: async (branch: string) => ({ branch }),
      onProgress: noopOff
    },
    themes: {
      fetchMarketplace: async () => ({ extensionId: '', displayName: '', themes: [] }),
      searchMarketplace: async () => []
    },
    onClosePreviewRequested: noopOff,
    onOpenFolderRequested: noopOff,
    onOpenUpdatesRequested: noopOff,
    onDeepLink: noopOff,
    onFocusSession: noopOff,
    onNotificationAction: noopOff,
    onPreviewFileChanged: noopOff,
    signalDeepLinkReady: async () => ({ ok: true })
  } satisfies Partial<Window['hermesDesktop']>

  window.hermesDesktop = bridge as unknown as Window['hermesDesktop']
}
