# @local/xhs-mcp

Configuration-only DSH bundle. It inserts one `@deepseek-ai/dsh-mcp-client` row that connects to the
locally running [xiaohongshu-mcp](https://github.com/xpzouying/xiaohongshu-mcp) server over Streamable
HTTP, so the agent gets `mcp__xiaohongshu__*` tools (keyword search, note detail, feed, profile).

- Endpoint: `http://127.0.0.1:18060/mcp` (the server must be running; see `../start-xhs-mcp.cmd`).
- `failOnStartupError: false` keeps DSH bootable when the server is down; reconnect retries with
  backoff and picks the server up once it starts.
- Third-party, unofficial automation: the session is your own logged-in Xiaohongshu account. Use a
  throwaway account, keep call rates low, and stay read-only.
