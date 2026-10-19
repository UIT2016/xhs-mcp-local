# @local/xhs-mcp

DSH bundle that **runs** the local [xiaohongshu-mcp](https://github.com/xpzouying/xiaohongshu-mcp)
server and **connects** it, so the agent gets `mcp__xiaohongshu__*` tools (keyword search, note
detail, feed, profile).

`cordis.patch.yml` inserts two rows:

1. **`xhs-mcp-server`** (`name: ./index.js`, Host half) — owns the server process. It spawns
   `bin/xiaohongshu-mcp-windows-amd64.exe -port 127.0.0.1:18060` when the plugin activates (DSH start
   or bundle re-enable) and terminates it when the plugin is disposed (DSH shutdown or bundle
   disable). All state stays inside the project folder via `USERPROFILE` / `APPDATA` /
   `LOCALAPPDATA` / `TEMP` / `COOKIES_PATH` overrides; server output is appended to `run/server.log`.
2. **`xhs-mcp`** (`@deepseek-ai/dsh-mcp-client`) — connects to `http://127.0.0.1:18060/mcp` over
   Streamable HTTP. `failOnStartupError: false` plus reconnect-with-backoff means ordering never
   matters: if the server comes up after DSH, the tools appear as soon as it answers.

**Lifecycle:** enabling the bundle starts the service; disabling it stops the service. `start-xhs-mcp.cmd`
in the project root is only needed to run the server *without* DSH.

**Row config** (`xhs-mcp-server`): `baseDir` (default `D:\code\codex\xhs`), `port` (default `18060`),
`logFile` (default `<baseDir>\run\server.log`).

**Caveats**

- Disposing the plugin kills the server process, but a Chromium that is mid-request can outlive it;
  end a stuck `chrome.exe` from Task Manager if that ever happens.
- The server binary and its bundled Chromium are not part of this bundle; fetch them with
  `tools/fetch-binaries.mjs` and `tools/fetch-browser.mjs` in the project root.
- Third-party, unofficial automation: the session is your own logged-in Xiaohongshu account. Use a
  throwaway account, keep call rates low, and stay read-only.
