// Minimal MCP streamable-http probe: initialize -> tools/list, print tool names.
const URL_ = process.argv[2] ?? 'http://127.0.0.1:18060/mcp';
const HEADERS = { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' };

function parseBody(text) {
  const trimmed = text.trim();
  if (trimmed.startsWith('{')) return JSON.parse(trimmed);
  for (const line of trimmed.split(/\r?\n/)) {
    if (line.startsWith('data:')) {
      try { return JSON.parse(line.slice(5).trim()); } catch {}
    }
  }
  throw new Error('unparseable body: ' + trimmed.slice(0, 200));
}

async function rpc(body, sessionId) {
  const res = await fetch(URL_, {
    method: 'POST',
    headers: sessionId ? { ...HEADERS, 'mcp-session-id': sessionId } : HEADERS,
    body: JSON.stringify(body),
  });
  const text = await res.text();
  return { res, text, json: text.trim() ? parseBody(text) : null };
}

const init = await rpc({
  jsonrpc: '2.0', id: 1, method: 'initialize',
  params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'dsh-probe', version: '1.0' } },
});
const sessionId = init.res.headers.get('mcp-session-id');
console.log('initialize:', init.res.status, 'protocol:', init.json?.result?.protocolVersion, 'session:', sessionId,
  'server:', JSON.stringify(init.json?.result?.serverInfo));

await rpc({ jsonrpc: '2.0', method: 'notifications/initialized' }, sessionId);
const list = await rpc({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} }, sessionId);
const tools = list.json?.result?.tools ?? [];
console.log(`\ntools (${tools.length}):`);
for (const t of tools) console.log(`- ${t.name}: ${(t.description ?? '').split('\n')[0].slice(0, 90)}`);

const search = tools.find((t) => t.name === 'search_feeds');
if (search) console.log('\nsearch_feeds input schema:\n' + JSON.stringify(search.inputSchema, null, 2));
