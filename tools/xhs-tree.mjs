// List repository paths of xpzouying/xiaohongshu-mcp that relate to browser/cookie/login config.
const res = await fetch('https://api.github.com/repos/xpzouying/xiaohongshu-mcp/git/trees/main?recursive=1');
const tree = await res.json();
if (!tree.tree) { console.log(JSON.stringify(tree).slice(0, 500)); process.exit(1); }
const re = /(browser|cookie|login|config|env|rod|path)/i;
const hits = tree.tree
  .filter((e) => e.type === 'blob' && /\.(go|md)$/.test(e.path) && re.test(e.path))
  .map((e) => `${e.path}  (${e.size}B)`);
console.log(`total blobs: ${tree.tree.length}`);
console.log(hits.join('\n'));
