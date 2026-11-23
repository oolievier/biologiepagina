/*
 * Haalt interne HTML-pagina's op die wel gelinkt worden maar niet in de
 * spiegel staan (en dus ook niet in de sitemap). Daarna kan build.js ze
 * gewoon omzetten naar het nieuwe thema.
 *
 * Gebruik: node tools/fetch-pages.js [spiegelmap] [domein]
 */
const fs = require('fs');
const path = require('path');

const SOURCE = path.resolve(process.argv[2] || '/tmp/opencode/bio-mirror/biologiepagina.nl');
const ORIGIN = process.argv[3] || 'https://biologiepagina.nl';
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/124 Safari/537.36';

function walk(dir, list) {
  list = list || [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'cdn-cgi' || e.name.startsWith('.')) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, list);
    else if (/\.html?$/i.test(e.name)) list.push(p);
  }
  return list;
}

function existsCase(p) {
  const dir = path.dirname(p);
  const name = path.basename(p).toLowerCase();
  if (!fs.existsSync(dir)) return false;
  return fs.readdirSync(dir).some(f => f.toLowerCase() === name);
}

(async () => {
  let total = 0;
  for (let pass = 0; pass < 6; pass++) {
    const pages = walk(SOURCE);
    const missing = new Map();
    for (const file of pages) {
      const text = fs.readFileSync(file, 'utf8');
      const re = /href\s*=\s*["']([^"']+)["']/gi;
      let m;
      while ((m = re.exec(text))) {
        const raw = m[1].split('#')[0].split('?')[0];
        if (!raw || !/\.html?$/i.test(raw) || /^(https?:|\/\/|mailto:|javascript:)/i.test(raw)) continue;
        let rel = decodeURIComponent(raw);
        if (rel.charAt(0) === '/') rel = rel.replace(/^\/+/, '');
        else rel = path.relative(SOURCE, path.resolve(path.dirname(file), rel));
        rel = path.normalize(rel).replace(/^(\.\.[/\\])+/, '');
        if (rel.startsWith('..')) continue;
        if (!existsCase(path.join(SOURCE, rel))) missing.set(rel.toLowerCase(), rel);
      }
    }
    if (!missing.size) { console.log('Geen ontbrekende pagina’s meer.'); break; }
    console.log('Pass', pass + 1, '- ontbrekende pagina’s:', missing.size);
    let fetched = 0;
    const queue = [...missing.values()];
    async function worker() {
      while (queue.length) {
        const rel = queue.shift();
        const target = path.join(SOURCE, rel);
        try {
          const url = ORIGIN + '/' + rel.split(path.sep).map(encodeURIComponent).join('/');
          const r = await fetch(url, { headers: { 'User-Agent': UA }, redirect: 'follow' });
          if (!r.ok) continue;
          // soft-404's van de oude site mogen niet als echte pagina worden opgeslagen
          const finalPath = decodeURIComponent(new URL(r.url).pathname).replace(/^\/+/, '').toLowerCase();
          if (finalPath !== rel.replace(/\\/g, '/').toLowerCase()) continue;
          const buf = Buffer.from(await r.arrayBuffer());
          const head = buf.toString('latin1', 0, 1500);
          if (!/^\s*<(!doctype|html)/i.test(head) || /deze pagina bestaat niet/i.test(head)) continue;
          fs.mkdirSync(path.dirname(target), { recursive: true });
          fs.writeFileSync(target, buf);
          fetched++;
        } catch (e) { /* pagina niet bereikbaar */ }
      }
    }
    await Promise.all(Array.from({ length: 10 }, worker));
    total += fetched;
    console.log('  opgehaald:', fetched);
    if (!fetched) break;
  }
  console.log('Totaal opgehaald:', total);
})();
