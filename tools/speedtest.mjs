// Measure throughput of a 1 MiB range request, direct vs ghfast.top mirror.
const url = 'https://github.com/xpzouying/xiaohongshu-mcp/releases/download/v2.5.5/xiaohongshu-mcp-windows-amd64.exe';
const candidates = { direct: url, ghfast: 'https://ghfast.top/' + url, ghproxy: 'https://gh-proxy.com/' + url };

for (const [name, u] of Object.entries(candidates)) {
  const t0 = Date.now();
  try {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 20000);
    const res = await fetch(u, { headers: { Range: 'bytes=0-1048575' }, signal: ac.signal, redirect: 'follow' });
    let n = 0;
    for await (const chunk of res.body) {
      n += chunk.length;
      if (n >= 1048576) break;
    }
    clearTimeout(timer);
    const dt = (Date.now() - t0) / 1000;
    console.log(`${name}: HTTP ${res.status} ${n} bytes in ${dt.toFixed(1)}s = ${(n / 1024 / dt).toFixed(0)} KB/s`);
  } catch (e) {
    console.log(`${name}: FAILED ${e.name} ${e.message}`);
  }
}
