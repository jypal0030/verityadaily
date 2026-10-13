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
