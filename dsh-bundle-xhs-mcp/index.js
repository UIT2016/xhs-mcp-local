/**
 * Host half of the @local/xhs-mcp bundle.
 *
 * Owns the local xiaohongshu-mcp server process:
 *   - starts when this plugin activates (DSH start, or re-enabling the plugin)
 *   - is terminated when the plugin is disposed (DSH shutdown, or disabling it)
 *
 * The MCP tools themselves are registered by the sibling
 * `@deepseek-ai/dsh-mcp-client` row in cordis.patch.yml, which connects to this
 * process over Streamable HTTP on loopback. Ordering does not have to be exact:
 * that row reconnects with backoff until the server answers.
 *
 * Plain `node:` built-ins only — no harness package is imported — so this file
 * resolves from any installed bundle location.
 */
import { spawn } from 'node:child_process'
import { createWriteStream, existsSync, mkdirSync } from 'node:fs'
import path from 'node:path'

/** Cordis plugin name used by loader diagnostics. */
export const name = 'xhs-mcp-server'

/** Fallback values; every field can be overridden by the row's `config`. */
const DEFAULTS = {
  baseDir: 'D:\\code\\codex\\xhs',
  port: 18060,
  logFile: 'run\\server.log',
}

function resolveConfig(config) {
  const raw = config && typeof config === 'object' ? config : {}
  const baseDir = typeof raw.baseDir === 'string' && raw.baseDir.length > 0 ? raw.baseDir : DEFAULTS.baseDir
  const port = Number.isInteger(raw.port) && raw.port > 0 && raw.port < 65536 ? raw.port : DEFAULTS.port
  const logFile =
    typeof raw.logFile === 'string' && raw.logFile.length > 0
      ? path.isAbsolute(raw.logFile)
        ? raw.logFile
        : path.join(baseDir, raw.logFile)
      : path.join(baseDir, DEFAULTS.logFile)
  return { baseDir, port, logFile }
}

export function apply(ctx, config) {
  const { baseDir, port, logFile } = resolveConfig(config)
  const exePath = path.join(baseDir, 'bin', 'xiaohongshu-mcp-windows-amd64.exe')
  const runDir = path.join(baseDir, 'run')
  const homeDir = path.join(baseDir, 'home')
  const tmpDir = path.join(baseDir, 'tmp')
  const cookiesPath = path.join(runDir, 'cookies.json')

  ctx.effect(() => {
    if (!existsSync(exePath)) {
      ctx.logger.error(
        `xhs-mcp-server: server binary not found at ${exePath} — run tools/fetch-binaries.mjs in the xhs-mcp-local project first`,
      )
      return () => {}
    }

    mkdirSync(runDir, { recursive: true })
    mkdirSync(tmpDir, { recursive: true })
    const log = createWriteStream(logFile, { flags: 'a' })
    log.write(`\n===== ${new Date().toISOString()} starting xiaohongshu-mcp on 127.0.0.1:${port} =====\n`)

    const child = spawn(exePath, ['-port', `127.0.0.1:${port}`], {
      cwd: runDir,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
      // Keep every byte of state inside the project folder instead of the user profile.
      env: {
        ...process.env,
        USERPROFILE: homeDir,
        APPDATA: path.join(homeDir, 'AppData', 'Roaming'),
        LOCALAPPDATA: path.join(homeDir, 'AppData', 'Local'),
        TEMP: tmpDir,
        TMP: tmpDir,
        COOKIES_PATH: cookiesPath,
      },
    })

    child.stdout?.pipe(log)
    child.stderr?.pipe(log)
    child.once('spawn', () => {
      ctx.logger.info(`xhs-mcp-server: started pid=${child.pid} → http://127.0.0.1:${port}/mcp`)
    })
    child.once('error', (error) => {
      ctx.logger.error(`xhs-mcp-server: spawn failed: ${error.message}`)
    })
    child.once('exit', (code, signal) => {
      ctx.logger.info(`xhs-mcp-server: exited code=${code} signal=${signal}`)
      log.end()
    })

    return () => {
      ctx.logger.info(`xhs-mcp-server: stopping pid=${child.pid}`)
      // Drop the exit listener so intentional shutdown is not logged as a crash.
      child.removeAllListeners('exit')
      try {
        child.kill()
      } catch (error) {
        ctx.logger.warn(`xhs-mcp-server: kill failed: ${String(error)}`)
      }
      log.end()
    }
  }, 'xhs-mcp-server')
}
