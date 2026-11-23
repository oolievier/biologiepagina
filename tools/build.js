/*
 * Build-script voor de vernieuwde Biologiepagina.nl.
 * Leest de gespiegelde originele site en schrijft hetzelfde bestandsoverzicht
 * weg met een volledig eigen thema. Inhoud (tekst, links, afbeeldingen,
 * oefeningen) blijft behouden; alleen de presentatielaag wordt vervangen.
 *
 * Gebruik: node tools/build.js [map-met-original-site] [uitvoermap]
 */

const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const SOURCE = path.resolve(process.argv[2] || '/tmp/opencode/bio-mirror/biologiepagina.nl');
const OUT = path.resolve(process.argv[3] || path.join(__dirname, '..'));

const NAV = [
  {
    title: 'Klassen',
    links: [
      ['Klas 1 · vmbo / havo / vwo', '/Brugklasnieuw/klas1.htm'],
      ['Klas 2', '/2en3/klas2.htm'],
      ['Klas 3', '/2en3/klas2.htm'],
      ['Vmbo 3 & 4', '/34mavo/mavo34.htm'],
      ['Havo 4', '/Havo4/Havo4.htm'],
      ['Havo 5', '/Havo5/Havo5.htm'],
      ['Vwo 4', '/Vwo4/vwo4.htm'],
      ['Vwo 5', '/Vwo5/vwo5.htm'],
      ['Vwo 6', '/Vwo6/vwo6.htm']
    ]
  },
  {
    title: 'Examens',
    links: [
      ['Vmbo BB', '/34mavo/examenbiologieVMBObb.htm'],
      ['Vmbo kader', '/34mavo/examenbiologieVMBOkader.htm'],
      ['Vmbo TL / mavo', '/34mavo/examenbiologie.htm'],
      ['Havo', '/Havo5/examen.htm'],
      ['Vwo', '/Vwo6/examenvwo.htm']
    ]
  },
  {
    title: 'Vaardigheden',
    links: [
      ['Verslag · onderbouw', '/verslagbiologieonderbouw.htm'],
      ['Verslag · bovenbouw', '/verslagbiologie.htm'],
      ['Tekenregels', '/tekenregels.htm'],
      ['Grafiek maken', '/grafiekmaken.htm'],
      ['Profielwerkstuk', '/Links/profielwerkstuk.htm'],
      ['Overige links', '/Links/links.htm']
    ]
  },
  {
    title: 'Over de site',
    links: [
      ['Contact', '/Contact/contact.htm'],
      ['Bronvermelding', '/richtlijnenbronvermelding.htm']
    ]
  }
];

const GROUPS = {
  'Brugklasnieuw': 'Klas 1', '1': 'Klas 1', '2en3': 'Klas 2 & 3',
  '34mavo': 'Vmbo 3 & 4', 'Havo4': 'Havo 4', 'Havo5': 'Havo 5',
  'Vwo4': 'Vwo 4', 'Vwo5': 'Vwo 5', 'Vwo6': 'Vwo 6',
  'ExamenHAVO': 'Examens · havo', 'ExamenVWO': 'Examens · vwo',
  'VmboBB': 'Examens · vmbo BB', 'VmboKader': 'Examens · vmbo kader',
  'Toetsen': 'Oefentoetsen', 'Oefeningen': 'Oefeningen',
  'Videobiologie': 'Video’s', 'Flashfiles': 'Interactieve lessen',
  'Links': 'Overige links', 'Contact': 'Contact', 'Videos': 'Video’s'
};

const TILES = {
  'vmbo1.jpg': ['vmbo', 'Klas 1'], 'havo1.jpg': ['havo', 'Klas 1'], 'vwo1.jpg': ['vwo', 'Klas 1'],
  'vmbo2.jpg': ['vmbo', 'Klas 2'], 'havo2.jpg': ['havo', 'Klas 2'], 'vwo2.jpg': ['vwo', 'Klas 2'],
  'vmbo3.jpg': ['vmbo', 'Klas 3'], 'havo3.jpg': ['havo', 'Klas 3'], 'vwo3.jpg': ['vwo', 'Klas 3'],
  'vmbo4.jpg': ['vmbo', 'Klas 4'], 'havo4.jpg': ['havo', 'Klas 4'], 'vwo4.jpg': ['vwo', 'Klas 4'],
  'havo5.jpg': ['havo', 'Klas 5'], 'vwo5.jpg': ['vwo', 'Klas 5'],
  'examenvmbotl.jpg': ['examen', 'Vmbo TL / mavo'], 'examenvmbokader.jpg': ['examen', 'Vmbo kader'],
  'examenvmbobb.jpg': ['examen', 'Vmbo BB'], 'examenhavo.jpg': ['examen', 'Havo'],
  'examenvwo.jpg': ['examen', 'Vwo'], 'linkspwsbiologie.jpg': ['extra', 'Profielwerkstuk'],
  'vwo6.jpg': ['vwo', 'Klas 6']
};

const SIMPLE_NAV_IMGS = new Set([
  'home.jpg', 'homeblauw.jpg', 'titel.jpg',
  'info.jpg', 'infogroen.jpg', 'oefenen.jpg', 'oefenengroen.jpg',
  'bestand.jpg', 'bestandgroen.jpg', 'pcles.jpg', 'pclesgroen.jpg',
  '1.jpg', '2.jpg', '3.jpg', '4.jpg', '5.jpg', '6.jpg', '7.jpg', '8.jpg', '9.jpg',
  '1g.jpg', '2g.jpg', '3g.jpg', '4g.jpg', '5g.jpg', '6g.jpg', '7g.jpg', '8g.jpg', '9g.jpg',
  'info2.jpg', 'info3.jpg', 'info6.jpg', 'info7.jpg'
]);

const JUNK = /cookiebot|googletagmanager|googletag|adsbygoogle|pagead2|doubleclick|google_ad_client|google_ad_slot|__CF\$cv\$params|cdn-cgi\/challenge-platform/i;

function decodeFile(file) {
  const buf = fs.readFileSync(file);
  const head = buf.slice(0, 4000).toString('latin1');
  const m = head.match(/charset\s*=\s*["']?([\w-]+)/i);
  const charset = (m && /utf-8/i.test(m[1])) ? 'utf-8' : 'windows-1252';
  return new TextDecoder(charset).decode(buf);
}

function cleanTitle(t) {
  return t
    .replace(/\s*\|\s*Biologiepagina\.nl\s*$/i, '')
    .replace(/\s*[-–—]\s*Biologiepagina\.nl\s*$/i, '')
    .replace(/^BIOLOGIEPAGINA\.nl\s*:\s*/i, '')
    .replace(/^Biologiepagina\s*:\s*/i, '')
    .replace(/^Biologiepagina\s*-\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function basename(src) {
  return decodeURIComponent((src || '').split('?')[0].split('/').pop() || '').toLowerCase();
}

function isNavImage($, img) {
  const src = $(img).attr('src') || '';
  const name = basename(src);
  if (!/\/images\//i.test(src)) return false;
  if (SIMPLE_NAV_IMGS.has(name)) return true;
  if (/^x.+\.jpg$/.test(name) || /^oudeversie/.test(name)) return true;
  return /biologiepagina[34]\.jpg$/.test(name);
}

function labelFromAlt(alt) {
  return (alt || '')
    .replace(/\s*[|].*$/, '')
    .replace(/\b(Biologie voor Jou|Nectar)\b/gi, '')
    .replace(/\b(biologie|oefenen|leren|oefenen en leren)\b/gi, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*[,:]\s*$/, '')
    .trim();
}

function removeJunk($) {
  $('script').each(function () {
    const el = $(this);
    const src = el.attr('src') || '';
    if (JUNK.test(src) || JUNK.test(el.html() || '')) el.remove();
  });
  $('ins.adsbygoogle, iframe[name="googlefcPresent"]').remove();
  $('style').each(function () {
    const css = $(this).html() || '';
    if (/background-color:\s*#F0FFE6/i.test(css)) {
      $(this).remove();
    } else if (/stylesheet used in the exercise/i.test(css)) {
      $(this).html(css.replace(/(^|[\}\n])\s*body\s*\{/g, '$1 .prose {'));
    }
  });
}

const MEDIA = 'img, iframe, embed, object, video, audio, canvas, applet, input, button, select, textarea, svg';

function pruneEmpty($) {
  for (let pass = 0; pass < 3; pass++) {
    $('a').each(function () {
      const a = $(this);
      if (a.text().trim() === '' && a.find(MEDIA).length === 0) a.remove();
    });
    $('tr').each(function () {
      const tr = $(this);
      if (tr.text().trim() === '' && tr.find(MEDIA).length === 0) tr.remove();
    });
    $('table').each(function () {
      const t = $(this);
      if (t.text().trim() === '' && t.find(MEDIA).length === 0) t.remove();
    });
    $('div, span').each(function () {
      const el = $(this);
      if (el.attr('class') && /^([\d]+u\$?|row|image fit|6u|3u|1u|2u|10u|8u)$/.test(el.attr('class').trim()) &&
          el.text().trim() === '' && el.find('a, ' + MEDIA).length === 0) el.remove();
    });
  }
}

function stripLegacyAttrs($) {
  $('table').each(function () {
    const t = $(this);
    if (t.attr('border') === '0' && t.find('th').length === 0) t.addClass('layout-table');
  });
  $('table, td, th, tr').removeAttr('width height bgcolor border cellspacing cellpadding align valign');
  $('[onload]').each(function () {
    const el = $(this);
    if (/MM_preloadImages/i.test(el.attr('onload') || '')) el.removeAttr('onload');
  });
  $('p').each(function () {
    const p = $(this);
    if (/^(\s|&nbsp;|\u00a0)*$/.test(p.html() || '')) p.remove();
  });
}

function sanitizeInlineStyles($) {
  $('[style]').each(function () {
    const el = $(this);
    const parts = (el.attr('style') || '').split(';').map(function (part) {
      const i = part.indexOf(':');
      if (i === -1) return '';
      const prop = part.slice(0, i).trim().toLowerCase();
      if (/^(color|background|background-color|font|font-family|font-size|font-weight)$/.test(prop)) return '';
      return part.trim();
    }).filter(Boolean);
    if (parts.length) el.attr('style', parts.join('; ')); else el.removeAttr('style');
  });
}

function normalisePath(p) {
  return '/' + p.replace(/\\/g, '/').replace(/^\/+/, '');
}

function absoluteHref(href, rel) {
  if (!href || /^(https?:|mailto:|tel:|javascript:|#|\/\/)/i.test(href)) return href;
  if (href.charAt(0) === '/') return href;
  const dir = path.posix.dirname(rel);
  return encodeURI(normalisePath(path.posix.normalize(path.posix.join(dir, href))));
}

// Lost oude site bevat paden met een verkeerde map erbij. Als zo'n pad niet
// bestaat, zoeken we naar de kortste bestaande variant met hetzelfde einde.
function resolveInternal(href, rel, known) {
  if (!href || /^(https?:|mailto:|tel:|javascript:|data:|#|\/\/)/i.test(href)) return href;
  const hashAt = href.indexOf('#');
  const hash = hashAt === -1 ? '' : href.slice(hashAt);
  let raw = hashAt === -1 ? href : href.slice(0, hashAt);
  const queryAt = raw.indexOf('?');
  const query = queryAt === -1 ? '' : raw.slice(queryAt);
  if (queryAt !== -1) raw = raw.slice(0, queryAt);
  let decoded;
  try { decoded = decodeURIComponent(raw); } catch (e) { decoded = raw; }
  let p = decoded.charAt(0) === '/'
    ? decoded.replace(/^\/+/, '')
    : path.posix.normalize(path.posix.join(path.posix.dirname(rel), decoded)).replace(/^\/+/, '');

  function found(q) {
    return known.get(q.toLowerCase()) || known.get((q + '/index.htm').toLowerCase()) ||
      known.get((q + '/index.html').toLowerCase());
  }
  let actual = found(p);
  if (!actual) {
    const parts = p.split('/');
    while (parts.length > 1) {
      parts.shift();
      actual = found(parts.join('/'));
      if (actual) break;
    }
  }
  if (actual) return '/' + actual.split('/').map(encodeURIComponent).join('/') + query + hash;
  return '/' + p.split('/').map(encodeURIComponent).join('/') + query + hash;
}

function main() {
  if (!fs.existsSync(SOURCE)) throw new Error('Bronmap bestaat niet: ' + SOURCE);
  const files = [];
  (function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(p);
      else if (/\.html?$/i.test(entry.name)) files.push(p);
    }
  })(SOURCE);

  const known = new Map();
  for (const f of files) {
    const r = path.relative(SOURCE, f).replace(/\\/g, '/');
    known.set(r.toLowerCase(), r);
  }
  known.set('index.html', known.get('index.htm') || 'index.htm');

  const searchIndex = [];

  for (const file of files) {
    const rel = path.relative(SOURCE, file).replace(/\\/g, '/');
    const html = decodeFile(file);
    const $ = cheerio.load(html, { decodeEntities: false });

    const rawTitle = $('title').first().text().trim();
    let bodyOnLoad = $('body').attr('onload') || '';
    if (/^MM_preloadImages\(/i.test(bodyOnLoad.trim())) bodyOnLoad = '';
    const originalTitle = cleanTitle(rawTitle);
    const isHome = rel === 'index.htm' || rel === 'index.html';
    const isWrapper = $('#wrapper').length > 0;
    let contentHtml;

    removeJunk($);
    // oude oefen- en toets-scripts staan vaak in de <head>: die moeten mee
    const headExtras = $('head script, head style').toArray().map(function (el) {
      return $.html(el);
    }).filter(Boolean).join('\n');

    if (isWrapper) {
      const inner = $('#main .inner');
      contentHtml = inner.length ? inner.html() : $('body').html();
      const $c = cheerio.load('<div id="content-root">' + contentHtml + '</div>', { decodeEntities: false });
      const root = $c('#content-root');

      // oude bannerafbeeldingen en kopteksten: de nieuwe kop neemt dit over
      root.find('img[src*="biologiepagina3.jpg"], img[src*="biologiepagina4.jpg"]').each(function () {
        $(this).closest('span').remove();
      });

      root.find('h1').remove();
      root.find('table').each(function () {
        if ($(this).text().trim() === '' && $(this).find('img, a').length === 0) $(this).remove();
      });

      // afbeeldingsknoppen worden leesbare tekstlinks met hetzelfde doel
      root.find('a').each(function () {
        const a = $(this);
        const img = a.find('img').first();
        if (!img.length) return;
        const name = basename(img.attr('src'));
        const tile = TILES[name];
        const isChapter = /^x.+\.jpg$/.test(name);
        if (!tile && !isChapter) return;
        const label = tile ? tile[1] : labelFromAlt(img.attr('alt') || img.attr('title'));
        if (!label) return;
        const level = tile ? '<span class="grade-grid__level">' + tile[0] + '</span>' : '';
        a.html(level + '<span class="grade-grid__name">' + $c('<div>').text(label).html() + '</span>');
        a.addClass('nav-tile-link');
        a.closest('span.image.fit').addClass('nav-tile');
      });

      // overige oude navigatie-afbeeldingen (methodelogo's e.d.) zijn chrome
      root.find('img').each(function () {
        if (/\/images\/navigatie\//i.test($(this).attr('src') || '')) $(this).remove();
      });
      root.find('span[align="center"]').each(function () {
        const s = $(this);
        const text = s.text().trim();
        if (!text) { s.remove(); return; }
        s.replaceWith($c('<p class="intro-rule-text">' + $c('<div>').text(text).html() + '</p>'));
      });
      root.find('sup').each(function () {
        $(this).replaceWith($c('<span class="partner-line">' + $c(this).html() + '</span>'));
      });
      pruneEmpty($c);
      stripLegacyAttrs($c);
      contentHtml = root.html();

      if (isHome) {
        // de oude rijen met klas-tegels worden één consistente grid
        const $h = cheerio.load('<div id="h">' + contentHtml + '</div>', { decodeEntities: false });
        const tiles = [];
        $h('a.nav-tile-link').each(function () {
          const a = $h(this);
          const lvl = a.find('.grade-grid__level').text().trim();
          const name = a.find('.grade-grid__name').text().trim();
          tiles.push('<li><a href="' + $h('<div>').text(absoluteHref(a.attr('href'), rel)).html() + '">' +
            '<span class="grade-grid__level">' + $h('<div>').text(lvl).html() + '</span>' +
            '<span class="grade-grid__name">' + $h('<div>').text(name).html() + '</span></a></li>');
        });
        $h('a.nav-tile-link').closest('.nav-tile, div').remove();
        if (tiles.length) {
          $h('#h').prepend('<ul class="grade-grid">' + tiles.join('') + '</ul>');
        }
        contentHtml = $h('#h').html();
      }
    } else {
      // oude, tabelgebaseerde pagina's
      $('img').each(function () {
        const img = $(this);
        const src = img.attr('src') || '';
        if (/biologiepagina[345]\.jpg/i.test(src)) {
          const wrap = img.closest('span, h1, h2, p');
          if (wrap.length && wrap.text().trim() === '') wrap.remove(); else img.remove();
          return;
        }
        if (/\/images\/navigatie\//i.test(src)) {
          const a = img.closest('a');
          if (a.length) {
            const label = labelFromAlt(img.attr('alt') || img.attr('title'));
            if (label) {
              a.empty().addClass('chapter-link').text(label);
              return;
            }
            a.remove();
          } else {
            img.remove();
          }
          return;
        }
        if (isNavImage($, this)) {
          const a = img.closest('a');
          if (a.length) a.remove(); else img.remove();
        }
      });
      pruneEmpty($);
      stripLegacyAttrs($);
      contentHtml = $('body').html();
      const $c = cheerio.load('<div id="content-root">' + contentHtml + '</div>', { decodeEntities: false });
      const root = $c('#content-root');
      root.find('h1').each(function () {
        const h = $(this);
        if (h.text().trim() === '' && h.find('img').length === 0) h.remove();
      });
      contentHtml = root.html();
    }

    // laatste schoonmaak in de inhoud
    const $f = cheerio.load('<div id="content-root">' + contentHtml + '</div>', { decodeEntities: false });
    const root = $f('#content-root');
    root.find('script').each(function () {
      if (JUNK.test($(this).html() || '') || JUNK.test($(this).attr('src') || '')) $(this).remove();
    });
    root.find('a[href]').each(function () {
      const a = $(this);
      a.attr('href', resolveInternal(a.attr('href'), rel, known));
    });
    root.find('img[src], iframe[src], embed[src]').each(function () {
      const el = $(this);
      el.attr('src', resolveInternal(el.attr('src'), rel, known));
    });
    root.find('object[data]').each(function () {
      const o = $(this);
      o.attr('data', resolveInternal(o.attr('data'), rel, known));
    });
    sanitizeInlineStyles($f);
    pruneEmpty($f);
    contentHtml = root.html().trim();

    // titel, kicker en breadcrumb
    let title = originalTitle;
    if (isHome) title = 'Biologie leren en oefenen';
    if (!title) title = 'Biologiepagina.nl';
    const firstDir = rel.indexOf('/') === -1 ? '' : rel.split('/')[0];
    const group = GROUPS[firstDir] || (isHome ? 'Start' : 'Biologiepagina.nl');
    const crumbs = ['<a href="/">Home</a>'];
    if (!isHome) crumbs.push('<span class="breadcrumb__sep">/</span><span>' +
      $f('<div>').text(group).html() + '</span>');

    const metaHtml = $('head meta').toArray().map(function (el) {
      const name = ($(el).attr('name') || $(el).attr('property') || $(el).attr('http-equiv') || '').toLowerCase();
      if (name === 'robots' || name === 'content-type') return '';
      const clone = $f(el).clone();
      clone.removeAttr('data-cookieconsent');
      return $f.html(clone);
    }).filter(Boolean).join('\n');

    const navHtml = NAV.map(function (g) {
      return '<div class="rail__group"><h2 class="rail__title">' + g.title + '</h2><ul class="rail__list">' +
        g.links.map(function (l) {
          return '<li><a href="' + l[1] + '">' + l[0] + '</a></li>';
        }).join('') + '</ul></div>';
    }).join('');

    const pageUrl = encodeURI('/' + rel.replace(/^index\.html?$/, ''));
    const brandSvg = '<svg class="brand__mark" viewBox="0 0 32 36" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<path d="M16 33V13"/><path d="M16 21C8 21 4 16 4 8c8 0 12 5 12 13Z"/><path d="M16 14C16 7 20 3 27 3c0 7-4 11-11 11Z"/><circle cx="16" cy="27" r="5"/></svg>';

    const outHtml = '<!doctype html>\n<html lang="nl">\n<head>\n' +
      '<meta charset="utf-8">\n' +
      '<meta name="viewport" content="width=device-width, initial-scale=1">\n' +
      '<title>' + $f('<div>').text(rawTitle || title).html() + '</title>\n' +
      metaHtml + '\n' +
      '<link rel="icon" href="/theme/favicon.svg" type="image/svg+xml">\n' +
      '<link rel="preconnect" href="https://fonts.googleapis.com">\n' +
      '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n' +
      '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&amp;family=Newsreader:opsz,wght@6..72,400;6..72,500&amp;display=swap">\n' +
      '<link rel="stylesheet" href="/theme/theme.css">\n' +
      headExtras + '\n' +
      '</head>\n<body id="TheBody"' + (bodyOnLoad ? ' onload="' + $f('<div>').text(bodyOnLoad).html() + '"' : '') + '>\n' +
      '<div class="read-progress" aria-hidden="true"></div>\n' +
      '<a class="skip-link" href="#content">Direct naar de inhoud</a>\n' +
      '<header class="masthead"><div class="masthead__inner">' +
      '<a class="brand" href="/" aria-label="Biologiepagina.nl — home">' + brandSvg +
      '<span class="brand__name">Biologie<em>pagina</em>.nl<small>Oefenen &amp; leren voor vmbo, havo en vwo</small></span></a>' +
      '<p class="masthead__tagline">Biologie bij Biologie voor Jou &amp; Nectar</p>' +
      '<div class="masthead__tools">' +
      '<div class="search"><label class="search__label" for="site-search">Zoek op deze site</label>' +
      '<input class="search__input" id="site-search" type="search" placeholder="Zoek" autocomplete="off">' +
      '<svg class="search__icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><circle cx="8.5" cy="8.5" r="5.5"/><path d="m13 13 4 4"/></svg>' +
      '<ul class="search__results" hidden aria-label="Zoekresultaten"></ul></div>' +
      '<button class="nav-toggle" type="button" aria-controls="site-rail" aria-expanded="false">Inhoud</button>' +
      '</div></div></header>\n' +
      '<div class="rail-backdrop" aria-hidden="true"></div>\n' +
      '<div class="shell">\n' +
      '<nav class="rail" id="site-rail" aria-label="Hoofdnavigatie">' +
      '<p class="rail__eyebrow">Inhoud</p>' + navHtml +
      '<div class="rail__foot"><a href="/Links/links.htm">Alle links</a> · <a href="/Contact/contact.htm">Contact</a></div>' +
      '</nav>\n' +
      '<main class="page" id="content">\n' +
      '<nav class="breadcrumb" aria-label="Kruimelpad">' + crumbs.join('') + '</nav>\n' +
      '<h1 class="page-title">' + $f('<div>').text(title).html() +
      '<span class="page-kicker">' + $f('<div>').text(group).html() + '</span></h1>\n' +
      '<div class="prose">' + contentHtml + '</div>\n' +
      '<footer class="page-footer"><p>Biologiepagina.nl · gratis oefenen en leren voor vmbo, havo en vwo.</p>' +
      '<p><a href="/Contact/contact.htm">Contact</a> · <a href="/richtlijnenbronvermelding.htm">Bronvermelding</a></p></footer>\n' +
      '</main>\n</div>\n' +
      '<script src="/theme/theme.js" defer></script>\n' +
      '</body>\n</html>\n';

    const target = path.join(OUT, rel);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, outHtml, 'utf8');
    if (isHome && !/index\.html$/i.test(rel)) {
      fs.writeFileSync(path.join(OUT, 'index.html'), outHtml, 'utf8');
    }
    if (/^404\.htm$/i.test(rel)) {
      fs.writeFileSync(path.join(OUT, '404.html'), outHtml, 'utf8');
    }

    const text = $f('#content-root').text().replace(/\s+/g, ' ').trim();
    searchIndex.push({
      title: title,
      url: pageUrl,
      group: group,
      excerpt: text.slice(0, 170)
    });
  }

  // alle niet-HTML-bestanden (afbeeldingen, pdf's, oude scripts,...) meekopiëren
  let copied = 0;
  (function copyAssets(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const src = path.join(dir, entry.name);
      if (entry.name === 'cdn-cgi') continue;
      if (entry.isDirectory()) { copyAssets(src); continue; }
      if (/\.html?$/i.test(entry.name)) continue;
      const rel = path.relative(SOURCE, src);
      const target = path.join(OUT, rel);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.copyFileSync(src, target);
      copied++;
    }
  })(SOURCE);

  fs.mkdirSync(path.join(OUT, 'theme'), { recursive: true });
  fs.writeFileSync(path.join(OUT, 'theme', 'search-index.json'), JSON.stringify(searchIndex), 'utf8');
  console.log('Verwerkt:', files.length, 'pagina’s,', copied, 'assets. Zoekindex:', searchIndex.length, 'items.');
}

main();
