/*
 * Vult ontbrekende assets aan. eerst uit de lokale spiegel, daarna vanaf de
 * oorspronkelijke site. Alleen bestanden die een pagina echt aanroep worden
 * opgehaald.
 *
 * Gebruik: node tools/fetch-missing.js [uitvoermap] [spiegelmap] [domein]
 */
const fs = require('fs');
const path = require('path');

const OUT = path.resolve(process.argv[2] || path.join(__dirname, '..'));
const MIRROR = process.argv[3] ? path.resolve(process.argv[3]) : null;
const ORIGIN = process.argv[4] || 'https://biologiepagina.nl';
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/124 Safari/537.36';

function walk(dir, list, filter) {
  list = list || [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith('.')) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, list, filter);
    else if (!filter || filter.test(e.name)) list.push(p);
  }
  return list;
}

function findCase(base, rel) {
  const full = path.join(base, rel);
  if (fs.existsSync(full)) return full;
  const parts = rel.split(/[\\/]/);
  let dir = base;
  for (let i = 0; i < parts.length; i++) {
    if (!fs.existsSync(dir)) return null;
    const matches = fs.readdirSync(dir).filter(f => f.toLowerCase() === parts[i].toLowerCase());
    if (!matches.length) return null;
    dir = path.join(dir, matches[0]);
  }
  return fs.statSync(dir).isFile() ? dir : null;
}

(async () => {
  const files = walk(OUT, null, /\.(html?|css|js)$/i);
  const wanted = new Map();
  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    const re = /(?:src|href|data)\s*=\s*["']([^"']+)["']|url\(\s*["']?([^"')]+)["']?\s*\)/gi;
    let m;
    while ((m = re.exec(text))) {
      const raw = (m[1] || m[2] || '').trim();
      if (!raw || /^(https?:|mailto:|tel:|javascript:|data:|#|\/\/)/i.test(raw)) continue;
      let p = decodeURIComponent(raw.split('#')[0].split('?')[0]);
      if (!p || p.endsWith('/')) continue;
      if (!path.isAbsolute(p)) p = path.relative(OUT, path.resolve(path.dirname(file), p));
      p = path.normalize(p).replace(/^(\.\.[/\\])+/, '');
      if (p.startsWith('..') || p.startsWith('theme' + path.sep)) continue;
      wanted.set(p, (wanted.get(p) || 0) + 1);
    }
  }

  const missing = [];
  for (const p of wanted.keys()) {
    if (!findCase(OUT, p)) missing.push(p);
  }
  console.log('Verschillende ontbrekende lokale bestanden:', missing.length);

  let copied = 0, fetched = 0, failed = 0;
  const queue = [...missing];
  async function worker() {
    while (queue.length) {
      const rel = queue.shift();
      const inMirror = MIRROR ? findCase(MIRROR, rel) : null;
      const target = path.join(OUT, rel);
      try {
        let data;
        if (inMirror) {
          data = fs.readFileSync(inMirror);
          copied++;
        } else {
          const url = ORIGIN + '/' + rel.split(path.sep).map(encodeURIComponent).join('/');
          const r = await fetch(url, { headers: { 'User-Agent': UA }, redirect: 'follow' });
          if (!r.ok) { failed++; continue; }
          data = Buffer.from(await r.arrayBuffer());
          fetched++;
        }
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.writeFileSync(target, data);
      } catch (e) {
        failed++;
      }
    }
  }
  await Promise.all(Array.from({ length: 12 }, worker));
  console.log('Uit spiegel gekopieerd:', copied, 'vanaf site opgehaald:', fetched, 'niet beschikbaar:', failed);
})();
