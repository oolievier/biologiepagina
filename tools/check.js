/*
 * Controle na de build:
 *  1. alle interne links verwijzen naar een bestaand bestand (ook bij andere hoofdletters);
 *  2. de zichtbare tekst van de oude pagina zit nog steeds in de nieuwe inhoud.
 *
 * Gebruik: NODE_PATH=<map-met-cheerio> node tools/check.js [bronmap] [uitvoermap]
 */
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const SOURCE = path.resolve(process.argv[2] || '/tmp/opencode/bio-mirror/biologiepagina.nl');
const OUT = path.resolve(process.argv[3] || path.join(__dirname, '..'));

function walk(dir, ext, list) {
  list = list || [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, ext, list);
    else if (!ext || ext.test(e.name)) list.push(p);
  }
  return list;
}

function decode(file) {
  const buf = fs.readFileSync(file);
  const head = buf.slice(0, 4000).toString('latin1');
  const utf8 = /charset\s*=\s*["']?utf-8/i.test(head);
  return new TextDecoder(utf8 ? 'utf-8' : 'windows-1252').decode(buf);
}

function words(s) {
  return (s || '').replace(/\s+/g, ' ').trim().toLowerCase()
    .split(' ').filter(w => w.length > 3);
}

const allFiles = walk(OUT, null, null);
const lowerMap = new Map();
for (const f of allFiles) {
  const rel = path.relative(OUT, f).replace(/\\/g, '/').toLowerCase();
  lowerMap.set(rel, f);
  lowerMap.set(decodeURIComponent(rel), f);
}

const newPages = walk(OUT, /\.html?$/i);
const missing = [];
const external = new Set();

for (const file of newPages) {
  const rel = path.relative(OUT, file).replace(/\\/g, '/');
  const $ = cheerio.load(fs.readFileSync(file, 'utf8'));
  $('a[href], img[src], iframe[src], script[src], link[href]').each(function () {
    const el = $(this);
    const raw = el.attr('href') || el.attr('src');
    if (!raw || /^(https?:|mailto:|tel:|javascript:|data:|#|\/\/)/i.test(raw)) return;
    let p = raw.split('#')[0].split('?')[0];
    if (!p) return;
    if (p === '/') p = '/index.html';
    p = decodeURIComponent(p);
    if (p.charAt(0) !== '/') {
      p = path.relative(OUT, path.resolve(path.dirname(file), p));
    }
    p = path.normalize(p).replace(/^\/+/, '').replace(/^(\.\.[/\\])+/, '').toLowerCase();
    if (!lowerMap.has(p) && !lowerMap.has(p + '.html') && !lowerMap.has(p + '.htm')) {
      missing.push(rel + '  ->  ' + raw);
    }
  });
}

const origPages = walk(SOURCE, /\.html?$/i);
const textLoss = [];
for (const file of origPages) {
  const rel = path.relative(SOURCE, file).replace(/\\/g, '/');
  let target = path.join(OUT, rel);
  if (!fs.existsSync(target) && fs.existsSync(path.join(OUT, 'index.html')) && /^index\.html?$/i.test(rel)) {
    target = path.join(OUT, 'index.html');
  }
  if (!fs.existsSync(target)) { textLoss.push([rel, 'pagina ontbreekt', 100]); continue; }
  const $old = cheerio.load(decode(file));
  $old('script, style, noscript').remove();
  const oldWords = words($old('body').text());
  if (oldWords.length < 25) continue;
  const $new = cheerio.load(fs.readFileSync(target, 'utf8'));
  const newText = $new('.prose').text() + ' ' + $new('.page-title').text();
  const newSet = new Set(words(newText));
  const lost = oldWords.filter(w => !newSet.has(w));
  const pct = Math.round(lost.length / oldWords.length * 100);
  if (pct > 12) textLoss.push([rel, lost.slice(0, 8).join(' '), pct]);
}

console.log('Interne verwijzingen niet gevonden:', missing.length);
missing.slice(0, 40).forEach(m => console.log('  ' + m));
console.log('Pagina’s met mogelijk tekstverlies:', textLoss.length);
textLoss.sort((a, b) => b[2] - a[2]).slice(0, 40).forEach(t => console.log('  ' + t[2] + '% ' + t[0] + ' :: ' + t[1]));
