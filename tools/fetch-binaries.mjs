// Download the two Windows binaries of xpzouying/xiaohongshu-mcp v2.5.5 and verify sha256.
import { createWriteStream } from 'node:fs';
import { mkdir, readFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import path from 'node:path';

const BASE = (process.env.MIRROR ?? 'https://gh-proxy.com/') + 'https://github.com/xpzouying/xiaohongshu-mcp/releases/download/v2.5.5';
const TARGETS = [
  { name: 'xiaohongshu-mcp-windows-amd64.exe', size: 15612416, sha256: 'cb55674f90c1649c875be9c4cde3af193b02fc34ffc860c40c8d711e6ca53e27' },
  { name: 'xiaohongshu-login-windows-amd64.exe', size: 10764288, sha256: 'edc313583d681701095e57688069a263ea06fa83f2e6a82c2d8578f8ba1224cd' },
];

const outDir = path.resolve(process.argv[2] ?? 'bin');
await mkdir(outDir, { recursive: true });

for (const t of TARGETS) {
  const dest = path.join(outDir, t.name);
  const res = await fetch(`${BASE}/${t.name}`, { redirect: 'follow' });
  if (!res.ok) throw new Error(`${t.name}: HTTP ${res.status}`);
  await pipeline(Readable.fromWeb(res.body), createWriteStream(dest));
  const buf = await readFile(dest);
  const sha = createHash('sha256').update(buf).digest('hex');
  const st = await stat(dest);
  const ok = sha === t.sha256 && st.size === t.size;
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${t.name} size=${st.size}/${t.size} sha256=${sha}${ok ? '' : ' expected=' + t.sha256}`);
  if (!ok) process.exitCode = 1;
}
