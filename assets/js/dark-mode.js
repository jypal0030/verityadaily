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
		var btn = document.getElementById('themeToggle') || document.getElementById('theme-toggle');
		if (btn) {
			btn.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
			btn.innerHTML = theme === 'dark' ? SUN_ICON : MOON_ICON;
		}
	}
	var MOON_ICON = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>';
	var SUN_ICON = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>';
	applyTheme(getInitialTheme());
	function initToggle() {
		var btn = document.getElementById('themeToggle');
		if (!btn) { return; }
		btn.addEventListener('click', function () {
			var current = root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
			var next = current === 'dark' ? 'light' : 'dark';
			applyTheme(next);
			try { localStorage.setItem(STORAGE_KEY, next); } catch (e) {}
		});
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
