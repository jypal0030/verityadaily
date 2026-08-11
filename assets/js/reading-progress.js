/**
 * Reading Progress Bar — Veritya Daily
 */
(function () {
	'use strict';
	var bar, article;
	function init() {
		bar = document.getElementById('readingProgress');
		article = document.querySelector('.article-body') || document.querySelector('article') || document.querySelector('#main');
		if (!bar || !article) { return; }
		window.addEventListener('scroll', update, { passive: true });
		window.addEventListener('resize', update, { passive: true });
		update();
	}
	var ticking = false;
	function update() {
		if (ticking) { return; }
		ticking = true;
		window.requestAnimationFrame(function () {
			var scrollTop = window.pageYOffset || document.documentElement.scrollTop;
			var docHeight = document.documentElement.scrollHeight - window.innerHeight;
			var pct = docHeight > 0 ? Math.min(100, Math.max(0, (scrollTop / docHeight) * 100)) : 0;
			bar.style.width = pct + '%';
			ticking = false;
		});
	}
	if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init); }
	else { init(); }
})();
