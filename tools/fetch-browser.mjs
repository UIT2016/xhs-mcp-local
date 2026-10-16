// Pre-download the project's built-in Chromium (windows-x64.zip) with resume + sha256 verify.
import { createWriteStream } from 'node:fs';
import { mkdir, readFile, stat, rename } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import path from 'node:path';

const VER = '148.0.7778.215';
const URL = `https://cdn.one-world.ai/browsers/${VER}/windows-x64.zip`;
const EXPECT = '5ae94143fa323167b7085242504e05dc8eeb6d96ca5feb80c887ade36f242b40';
const dest = path.resolve(process.argv[2] ?? `bin/browser/${VER}/windows-x64.zip`);
await mkdir(path.dirname(dest), { recursive: true });

let have = 0;
try { have = (await stat(dest)).size; } catch { have = 0; }

if (have > 0) console.log(`resuming from ${(have / 1048576).toFixed(1)} MiB`);
const res = await fetch(URL, { headers: have > 0 ? { Range: `bytes=${have}-` } : {} });
if (!res.ok) throw new Error(`HTTP ${res.status}`);
const total = have + Number(res.headers.get('content-length') ?? 0);
console.log(`HTTP ${res.status}, total ≈ ${(total / 1048576).toFixed(1)} MiB`);

const tmp = dest + '.part';
const t0 = Date.now();
let written = have;
let lastLog = 0;
const body = Readable.fromWeb(res.body);
body.on('data', (c) => {
  written += c.length;
  if (written - lastLog > 20 * 1048576) {
    lastLog = written;
    const mb = (written / 1048576).toFixed(1);
    const kbs = ((written - have) / 1024 / ((Date.now() - t0) / 1000)).toFixed(0);
    console.log(`  ${mb} MiB  (${kbs} KB/s)`);
  }
});
await pipeline(body, createWriteStream(tmp, have > 0 && res.status === 206 ? { flags: 'a' } : { flags: 'w' }));
await rename(tmp, dest);

const st = await stat(dest);
const sha = createHash('sha256').update(await readFile(dest)).digest('hex');
console.log(`${sha === EXPECT && st.size === total ? 'OK  ' : 'FAIL'} size=${st.size}/${total} sha256=${sha}`);
if (sha !== EXPECT) { console.log(`expected=${EXPECT}`); process.exitCode = 1; }
