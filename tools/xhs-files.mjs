// Print selected upstream source files (raw) for a quick read.
const BASES = [
  'https://raw.githubusercontent.com/xpzouying/xiaohongshu-mcp/main/',
  'https://gh-proxy.com/https://raw.githubusercontent.com/xpzouying/xiaohongshu-mcp/main/',
];
for (const p of process.argv.slice(2)) {
  let done = false;
  for (const base of BASES) {
    for (let attempt = 1; attempt <= 2 && !done; attempt++) {
      try {
        const res = await fetch(base + p);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        console.log(`\n===== ${p} =====`);
        console.log(await res.text());
        done = true;
      } catch (e) {
        if (base === BASES.at(-1) && attempt === 2) console.log(`\n===== ${p} FAILED: ${e.message} =====`);
      }
    }
  }
}
