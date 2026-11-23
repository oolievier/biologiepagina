/* Biologiepagina.nl — eigen theme-gedrag
   Kleine, zelfstandige scriptjes: navigatie, zoeken, leesvoortgang. */
(function () {
  'use strict';

  var body = document.body;

  /* --- mobiele navigatie ------------------------------------------------ */
  var toggle = document.querySelector('.nav-toggle');
  var backdrop = document.querySelector('.rail-backdrop');
  var rail = document.querySelector('.rail');

  function setNav(open) {
    body.classList.toggle('nav-open', open);
    if (toggle) toggle.setAttribute('aria-expanded', String(open));
    if (rail) rail.setAttribute('aria-hidden', String(!open && window.matchMedia('(max-width: 940px)').matches));
  }

  if (toggle) {
    toggle.addEventListener('click', function () {
      setNav(!body.classList.contains('nav-open'));
    });
  }
  if (backdrop) backdrop.addEventListener('click', function () { setNav(false); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') setNav(false);
  });
  if (rail) {
    rail.addEventListener('click', function (e) {
      if (e.target.closest('a')) setNav(false);
    });
  }
  window.matchMedia('(min-width: 941px)').addEventListener('change', function (e) {
    if (e.matches) setNav(false);
  });

  /* --- actieve pagina in de zijbalk ------------------------------------- */
  var here = window.location.pathname.replace(/\/+$/, '');
  var candidates = [here, here.replace(/\/index\.html?$/, ''), '/' ];
  Array.prototype.forEach.call(document.querySelectorAll('.rail a[href]'), function (link) {
    var href = link.getAttribute('href').split('#')[0].replace(/\/+$/, '');
    if (candidates.indexOf(href) !== -1 && !link.hasAttribute('aria-current')) {
      link.setAttribute('aria-current', 'page');
    }
  });

  /* --- zoeken in de eigen index ----------------------------------------- */
  var input = document.querySelector('.search__input');
  var results = document.querySelector('.search__results');
  var index = null;
  var selected = -1;

  function normalise(s) {
    return (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  function render(items, query) {
    if (!results) return;
    results.textContent = '';
    selected = -1;
    if (!items.length) {
      var empty = document.createElement('li');
      empty.className = 'search__empty';
      empty.textContent = query ? 'Geen pagina’s gevonden.' : '';
      if (query) results.appendChild(empty);
    }
    items.forEach(function (item) {
      var li = document.createElement('li');
      var a = document.createElement('a');
      a.href = item.url;
      var title = document.createElement('strong');
      title.textContent = item.title;
      var meta = document.createElement('span');
      meta.textContent = item.group || 'Biologiepagina.nl';
      a.appendChild(title);
      a.appendChild(meta);
      li.appendChild(a);
      results.appendChild(li);
    });
    results.hidden = !items.length || !query;
  }

  function search(q) {
    if (!index || !q.trim()) { render([], q); return; }
    var terms = normalise(q).split(/\s+/).filter(Boolean);
    var scored = [];
    for (var i = 0; i < index.length; i++) {
      var p = index[i];
      var hay = normalise(p.title + ' ' + (p.group || '') + ' ' + (p.excerpt || ''));
      var score = 0;
      var ok = true;
      for (var t = 0; t < terms.length; t++) {
        var at = hay.indexOf(terms[t]);
        if (at === -1) { ok = false; break; }
        score += (at === 0 ? 6 : 1) + (normalise(p.title).indexOf(terms[t]) !== -1 ? 4 : 0);
      }
      if (ok) scored.push({ item: p, score: score });
    }
    scored.sort(function (a, b) { return b.score - a.score; });
    render(scored.slice(0, 8).map(function (s) { return s.item; }), q);
  }

  if (input) {
    input.addEventListener('focus', function () {
      if (!index) {
        fetch('/theme/search-index.json').then(function (r) { return r.ok ? r.json() : []; })
          .then(function (data) { index = data; search(input.value); })
          .catch(function () { index = []; });
      }
    });
    input.addEventListener('input', function () { search(input.value); });
    input.addEventListener('keydown', function (e) {
      if (!results || results.hidden) return;
      var links = results.querySelectorAll('a');
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (links.length) {
          selected = e.key === 'ArrowDown' ? (selected + 1) % links.length : (selected - 1 + links.length) % links.length;
          Array.prototype.forEach.call(links, function (a, i) { a.setAttribute('aria-selected', String(i === selected)); });
          links[selected].focus();
        }
      } else if (e.key === 'Escape') {
        results.hidden = true;
      }
    });
    document.addEventListener('click', function (e) {
      if (results && !results.contains(e.target) && e.target !== input) results.hidden = true;
    });
  }

  /* --- subtiele leesvoortgang ------------------------------------------- */
  var bar = document.querySelector('.read-progress');
  if (bar) {
    var update = function () {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.width = (max > 0 ? Math.min(100, (window.scrollY / max) * 100) : 0) + '%';
    };
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
  }

  /* --- veilige externe links -------------------------------------------- */
  Array.prototype.forEach.call(document.querySelectorAll('a[target="_blank"]'), function (a) {
    if (!a.hasAttribute('rel')) a.setAttribute('rel', 'noopener noreferrer');
  });
})();
