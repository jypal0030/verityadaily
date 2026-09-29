/**
 * Veritya Daily — native share sheet + card share chips + copy-link (v1)
 */
(function () {
	'use strict';
	function prefersReduced() { try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } }
	function abs(u) { try { return new URL(u, location.origin).href; } catch (e) { return u; } }
	function doCopy(btn, url, restoreHtml) {
		function done() {
			var orig = btn.innerHTML;
			btn.innerHTML = '\u2713';
			setTimeout(function () { btn.innerHTML = orig; }, 1400);
		}
		if (navigator.clipboard && navigator.clipboard.writeText) {
			navigator.clipboard.writeText(url).then(done).catch(function () { legacy(url); done(); });
		} else { legacy(url); done(); }
	}
	function legacy(u) {
		var ta = document.createElement('textarea');
		ta.value = u; ta.style.position = 'fixed'; ta.style.opacity = '0';
		document.body.appendChild(ta); ta.select();
		try { document.execCommand('copy'); } catch (e) {}
		document.body.removeChild(ta);
	}
	document.addEventListener('click', function (e) {
		var cp = e.target && e.target.closest ? e.target.closest('.sh-cp') : null;
		if (cp) {
			e.preventDefault();
			var card = cp.closest('[data-url]');
			var url = card ? abs(card.getAttribute('data-url')) : (cp.getAttribute('data-url') ? abs(cp.getAttribute('data-url')) : location.href);
			doCopy(cp, url);
			return;
		}
		var trigger = e.target && e.target.closest ? e.target.closest('.vdy-share-native') : null;
		if (trigger) {
			e.preventDefault();
			var wrap = trigger.closest('[data-url]');
			var u = wrap ? abs(wrap.getAttribute('data-url')) : location.href;
			var t = document.title;
			if (wrap) { var h = wrap.querySelector('.post-card__title, h1, .post-title'); if (h) t = h.textContent.trim(); }
			if (navigator.share) { navigator.share({ title: t, url: u }).catch(function () {}); }
			else { doCopy(trigger, u); }
		}
	});
})();
