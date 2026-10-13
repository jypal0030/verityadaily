/**
 * Dark Mode Toggle — Veritya Daily
 * respects system preference on first visit, remembers choice in localStorage
 */
(function () {
	'use strict';
	var STORAGE_KEY = 'veritya-theme';
	var root = document.documentElement;
	function getInitialTheme() {
		var saved = null;
		try { saved = localStorage.getItem(STORAGE_KEY); } catch (e) {}
		if (saved === 'light' || saved === 'dark') { return saved; }
		return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
	}
	function applyTheme(theme) {
		if (theme === 'dark') { root.setAttribute('data-theme', 'dark'); }
		else { root.removeAttribute('data-theme'); }
		var btns = document.querySelectorAll('[id="themeToggle"], [data-theme-toggle]');
		for (var i = 0; i < btns.length; i++) {
			var b = btns[i];
			b.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
			b.innerHTML = (theme === 'dark' ? SUN_ICON : MOON_ICON) + (b.hasAttribute('data-theme-toggle') ? '<span>Theme</span>' : '');
		}
	}
	var MOON_ICON = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>';
	var SUN_ICON = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>';
	applyTheme(getInitialTheme());
	function initToggle() {
		var btns = document.querySelectorAll('[id="themeToggle"], [data-theme-toggle]');
		for (var i = 0; i < btns.length; i++) {
			btns[i].addEventListener('click', function () {
				var current = root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
				var next = current === 'dark' ? 'light' : 'dark';
				applyTheme(next);
				try { localStorage.setItem(STORAGE_KEY, next); } catch (e) {}
			});
		}
	}
	if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', initToggle); }
	else { initToggle(); }
})();


/* === NEXUS ABSOLUTE: copy-link wiring (D7) — delegated, no inline JS needed === */
document.addEventListener('click', function (e) {
  var t = e.target && e.target.closest ? e.target.closest('.share-copy, .icon-button[aria-label="Copy link"]') : null;
  if (!t) { return; }
  e.preventDefault();
  var url = t.getAttribute('data-url') || window.location.href;
  function done() {
    var orig = t.innerHTML;
    if (t.classList.contains('share-copy')) { t.textContent = '\u2713'; }
    else { t.setAttribute('aria-label', 'Copied!'); }
    setTimeout(function () { t.innerHTML = orig; t.setAttribute('aria-label', 'Copy link'); }, 1500);
  }
  function fallback(u) {
    var ta = document.createElement('textarea');
    ta.value = u; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); } catch (err) {}
    document.body.removeChild(ta);
  }
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(url).then(done, function () { fallback(url); done(); });
  } else { fallback(url); done(); }
});

/* === NEXUS ABSOLUTE: newsletter form wiring (D5) — opens prefilled mail request === */
document.addEventListener('submit', function (e) {
  var form = e.target;
  if (!form || !form.classList || !form.classList.contains('newsletter-form')) { return; }
  e.preventDefault();
  var email = form.querySelector('input[type="email"]');
  if (!email || !email.value || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.value)) {
    if (email) { email.focus(); email.setAttribute('aria-invalid', 'true'); }
    return;
  }
  var btn = form.querySelector('button[type="submit"]');
  if (btn) { btn.textContent = 'Opening email app\u2026'; btn.disabled = true; }
  var mailto = 'mailto:hello@verityadaily.com?subject=' + encodeURIComponent('Newsletter signup: The Daily Brief') +
    '&body=' + encodeURIComponent('Please subscribe ' + email.value + ' to The Daily Brief (Veritya Daily).');
  window.location.href = mailto;
  setTimeout(function () { if (btn) { btn.textContent = 'SUBSCRIBE'; btn.disabled = false; } }, 3000);
});


/* === NAV ACTIVE ENGINE (VD-NAV v1, 2026-10-13) ===
   Source of truth: BreadcrumbList JSON-LD -> category slug (fallback: URL).
   Self-heals baked/wrong nav active states on EVERY page (incl. future posts).
   Idempotent: clears desktop .active-nav + bottom-nav .active, then sets exactly one. */
(function () {
  'use strict';
  var CATS = ['ai', 'crypto', 'finance', 'cybersecurity', 'technology', 'trending'];
  function catFromJSONLD() {
    try {
      var scripts = document.querySelectorAll('script[type="application/ld+json"]');
      for (var i = 0; i < scripts.length; i++) {
        var data;
        try { data = JSON.parse(scripts[i].textContent); } catch (e) { continue; }
        var graph = data && data['@graph'] ? data['@graph'] : [data];
        for (var g = 0; g < graph.length; g++) {
          var obj = graph[g];
          if (obj && obj['@type'] === 'BreadcrumbList' && obj.itemListElement) {
            var items = obj.itemListElement;
            for (var k = items.length - 1; k >= 1 && k >= items.length - 2; k--) {
              var it = items[k] && items[k].item;
              var id = it && (typeof it === 'string' ? it : (it['@id'] || ''));
              var m = String(id).match(/category-([a-z0-9-]+)/);
              if (m && CATS.indexOf(m[1]) >= 0) return m[1];
            }
          }
        }
      }
    } catch (e) {}
    return null;
  }
  function catFromURL() {
    try {
      var m = location.pathname.match(/category-([a-z0-9-]+)/);
      if (m && CATS.indexOf(m[1]) >= 0) return m[1];
    } catch (e) {}
    return null;
  }
  function apply(cat) {
    var stale = document.querySelectorAll('.main-nav a.active-nav, .nav-desktop a.active-nav, .bottom-nav__item.active');
    for (var i = 0; i < stale.length; i++) {
      stale[i].classList.remove('active-nav', 'active');
      stale[i].removeAttribute('aria-current');
    }
    var d = document.querySelectorAll('.main-nav a[href$="category-' + cat + '"], .nav-desktop a[href$="category-' + cat + '"]');
    for (var j = 0; j < d.length; j++) {
      d[j].classList.add('active-nav');
      d[j].setAttribute('aria-current', 'page');
    }
    var b = document.querySelectorAll('.bottom-nav__item[href$="category-' + cat + '"]');
    for (var k = 0; k < b.length; k++) b[k].classList.add('active');
  }
  function init() {
    var cat = catFromJSONLD() || catFromURL();
    if (cat) apply(cat);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

/* ================= VD-UX v1 — header elevation + command search ================= */
(function () {
  'use strict';
  function ready(fn) { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fn); else fn(); }
  ready(function () {
    if ((document.body.getAttribute('data-page') || '') === 'admin') return;

    /* ---- header scroll elevation ---- */
    var hdr = document.querySelector('.site-header');
    if (hdr) {
      var ticking = false;
      var onScroll = function () {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(function () {
          hdr.classList.toggle('is-scrolled', (window.pageYOffset || document.documentElement.scrollTop || 0) > 8);
          ticking = false;
        });
      };
      window.addEventListener('scroll', onScroll, { passive: true });
      onScroll();
    }

    /* ---- command search overlay ---- */
    var DATA = null, loaded = false, loading = false;
    var root = null, backdrop = null, input = null, resultsEl = null, chipsEl = null;
    var chip = 'all', sel = -1, shown = [], lastFocus = null;
    var CHIPS = [['All', 'all'], ['AI', 'ai'], ['Crypto', 'crypto'], ['Finance', 'finance'], ['Cybersecurity', 'cyber'], ['Technology', 'tech'], ['Trending', 'trend']];

    function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }

    function build() {
      if (root) return;
      backdrop = document.createElement('div');
      backdrop.className = 'vd-search-backdrop';
      root = document.createElement('div');
      root.className = 'vd-search';
      root.setAttribute('role', 'dialog');
      root.setAttribute('aria-modal', 'true');
      root.setAttribute('aria-label', 'Search Veritya Daily');
      root.innerHTML =
        '<div class="vd-search__bar">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>' +
          '<input type="search" placeholder="Search articles - AI, crypto, breaches..." aria-label="Search articles">' +
          '<button type="button" class="vd-search__close" aria-label="Close search"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button>' +
        '</div>' +
        '<div class="vd-search__chips" role="group" aria-label="Filter by topic"></div>' +
        '<div class="vd-search__results"></div>' +
        '<div class="vd-search__foot"><span><kbd>&uarr;</kbd><kbd>&darr;</kbd> navigate</span><span><kbd>&crarr;</kbd> open</span><span><kbd>esc</kbd> close</span></div>';
      document.body.appendChild(backdrop);
      document.body.appendChild(root);
      input = root.querySelector('input');
      resultsEl = root.querySelector('.vd-search__results');
      chipsEl = root.querySelector('.vd-search__chips');
      CHIPS.forEach(function (c) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'vd-search__chip';
        b.textContent = c[0];
        b.setAttribute('aria-pressed', c[1] === chip ? 'true' : 'false');
        b.addEventListener('click', function () {
          chip = c[1];
          chipsEl.querySelectorAll('.vd-search__chip').forEach(function (x) { x.setAttribute('aria-pressed', 'false'); });
          b.setAttribute('aria-pressed', 'true');
          render();
          input.focus();
        });
        chipsEl.appendChild(b);
      });
      root.querySelector('.vd-search__close').addEventListener('click', close);
      backdrop.addEventListener('click', close);
      input.addEventListener('input', function () { render(); });
      input.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowDown') { e.preventDefault(); move(1); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1); }
        else if (e.key === 'Enter') { e.preventDefault(); if (shown.length) go(shown[Math.max(sel, 0)]); }
      });
    }

    function extract(html) {
      var i = html.indexOf('const DATA');
      if (i < 0) return null;
      i = html.indexOf('[', i);
      if (i < 0) return null;
      var depth = 0, inStr = false, escNext = false;
      for (var j = i; j < html.length; j++) {
        var ch = html.charAt(j);
        if (inStr) {
          if (escNext) escNext = false;
          else if (ch === '\\') escNext = true;
          else if (ch === '"') inStr = false;
        } else {
          if (ch === '"') inStr = true;
          else if (ch === '[') depth++;
          else if (ch === ']') { depth--; if (depth === 0) { try { return JSON.parse(html.slice(i, j + 1)); } catch (e) { return null; } } }
        }
      }
      return null;
    }

    function load() {
      if (loaded || loading) return;
      loading = true;
      fetch('/search').then(function (r) { return r.text(); }).then(function (t) {
        DATA = extract(t) || [];
        loaded = true; loading = false;
        render();
      }).catch(function () { loading = false; location.href = '/search'; });
    }

    function render() {
      if (!DATA) { resultsEl.innerHTML = '<div class="vd-search__empty">Loading search index...</div>'; return; }
      var q = input.value.trim().toLowerCase();
      var terms = q.split(/\s+/).filter(Boolean);
      var list = DATA.filter(function (a) {
        var h = (a.t + ' ' + a.k + ' ' + a.s).toLowerCase();
        if (chip !== 'all' && h.indexOf(chip) < 0) return false;
        for (var i = 0; i < terms.length; i++) if (h.indexOf(terms[i]) < 0) return false;
        return true;
      });
      list = (!q && chip === 'all') ? list.slice(0, 12) : list.slice(0, 10);
      shown = list; sel = -1;
      if (!list.length) { resultsEl.innerHTML = '<div class="vd-search__empty">No matches for "' + esc(q) + '" - try another keyword.</div>'; return; }
      resultsEl.innerHTML = list.map(function (a) {
        return '<a class="vd-search__item" href="/' + esc(a.s) + '">' +
          '<img src="assets/img/' + esc(a.i || 'og-image.png') + '" alt="" loading="lazy" width="64" height="40">' +
          '<span><span class="vd-t">' + esc(a.t) + '</span><span class="vd-k">' + esc(a.k || 'Article') + '</span></span></a>';
      }).join('');
      resultsEl.querySelectorAll('.vd-search__item').forEach(function (el, i2) {
        el.addEventListener('mousemove', function () { mark(i2); });
      });
    }

    function mark(n) {
      sel = n;
      resultsEl.querySelectorAll('.vd-search__item').forEach(function (el, i2) { el.classList.toggle('sel', i2 === sel); });
    }
    function move(d) {
      if (!shown.length) return;
      sel = (sel + d + shown.length) % shown.length;
      mark(sel);
      var el = resultsEl.querySelectorAll('.vd-search__item')[sel];
      if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest' });
    }
    function go(a) { close(); if (a && a.s) location.href = '/' + a.s; }

    function open() {
      build();
      lastFocus = document.activeElement;
      backdrop.classList.add('open');
      root.classList.add('open');
      document.body.style.overflow = 'hidden';
      if (!loaded) load(); else render();
      setTimeout(function () { input.focus(); }, 60);
    }
    function close() {
      if (!root) return;
      backdrop.classList.remove('open');
      root.classList.remove('open');
      document.body.style.overflow = '';
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    /* bind openers: header search icon + Ctrl/Cmd+K hint chip */
    var bound = false;
    document.querySelectorAll('.header-actions .icon-button[aria-label="Search"], .header-actions .icon-button[aria-label="Search (Ctrl+K)"]').forEach(function (btn) {
      btn.removeAttribute('onclick');
      btn.setAttribute('aria-label', 'Search (Ctrl+K)');
      btn.setAttribute('title', 'Search (Ctrl+K)');
      btn.addEventListener('click', open);
      if (!bound && !document.querySelector('.vd-kbd')) {
        bound = true;
        var k = document.createElement('button');
        k.type = 'button';
        k.className = 'vd-kbd';
        k.setAttribute('aria-label', 'Open search');
        k.textContent = 'Ctrl K';
        k.addEventListener('click', open);
        btn.parentNode.insertBefore(k, btn);
      }
    });

    document.addEventListener('keydown', function (e) {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        if (root && root.classList.contains('open')) close(); else open();
      } else if (e.key === 'Escape') {
        if (root && root.classList.contains('open')) close();
      } else if (e.key === '/' && (!root || !root.classList.contains('open'))) {
        var t = e.target;
        var tag = t && t.tagName ? t.tagName.toLowerCase() : '';
        if (tag !== 'input' && tag !== 'textarea' && !t.isContentEditable) { e.preventDefault(); open(); }
      }
    });
  });
})();
