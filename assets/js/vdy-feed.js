/* Veritya Daily — smart feed pagination (home + category pages)
 * Auto-generated infrastructure file. Config comes from window.VDY_CONF, data from vdy-posts-index.js.
 * SEO-safe: page-1 content is server-rendered; pager links are real crawlable hrefs;
 * JS intercepts clicks for no-reload updates; rel prev/next kept in sync.
 */
(function () {
  'use strict';
  var conf = window.VDY_CONF || {};
  var posts = window.VDY_POSTS || [];
  if (!conf.mode || !posts.length) return;

  var CAT_LABEL = { crypto: 'Crypto', ai: 'AI', finance: 'Finance', cybersecurity: 'Cybersecurity', technology: 'Technology', trending: 'Trending' };
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function fmtDate(iso) {
    try { return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }); } catch (e) { return ''; }
  }

  var pool = (conf.mode === 'cat' && conf.cat !== 'trending') ? posts.filter(function (p) { return p.c === conf.cat; }) : posts.slice();
  var per = conf.per || 12;
  var pages = Math.max(1, Math.ceil(pool.length / per));
  var cur = 1;
  var m = /(?:^|[?&])page=(\d+)/.exec(location.search);
  if (m) cur = Math.min(pages, Math.max(1, parseInt(m[1], 10) || 1));

  var gridEl = document.getElementById('vdy-feed-grid');
  var pagerEl = document.getElementById('vdy-pager');
  if (!gridEl || !pagerEl) return;

  function card(p) {
    var label = CAT_LABEL[p.c] || 'Technology';
    return '<article class="post-card">' +
      '<a href="' + esc(p.s) + '" class="post-card__image" style="text-decoration:none;"><img loading="lazy" width="400" height="225" src="' + esc(p.h) + '" alt="' + esc(p.t.slice(0, 80)) + '" style="width:100%;height:auto;border-radius:8px;"></a>' +
      '<div class="post-card__body">' +
      '<span class="kicker">' + esc(label) + '</span>' +
      '<h3 class="post-card__title"><a href="' + esc(p.s) + '">' + esc(p.t) + '</a></h3>' +
      '<div class="post-card__meta">Jai &middot; ' + esc(fmtDate(p.d)) + '</div>' +
      '</div></article>';
  }

  function pageUrl(n) {
    var base = location.pathname;
    return n <= 1 ? base : base + '?page=' + n;
  }

  // smart number window: 1 … a b c … last (compact, no more than 7 items)
  function nums(cur, total) {
    var out = [1];
    var lo = Math.max(2, cur - 1), hi = Math.min(total - 1, cur + 1);
    if (lo > 2) out.push('…');
    for (var i = lo; i <= hi; i++) out.push(i);
    if (hi < total - 1) out.push('…');
    if (total > 1) out.push(total);
    return out;
  }

  function relLink(kind, n) {
    var sel = 'link[rel="' + kind + '"]';
    var el = document.querySelector(sel);
    if (n >= 1 && n <= pages) {
      if (!el) { el = document.createElement('link'); el.rel = kind; document.head.appendChild(el); }
      el.href = pageUrl(n);
    } else if (el) { el.parentNode.removeChild(el); }
  }

  function render() {
    var slice = pool.slice((cur - 1) * per, cur * per);
    gridEl.innerHTML = slice.map(card).join('');
    gridEl.classList.add('vdy-fadein');
    setTimeout(function () { gridEl.classList.remove('vdy-fadein'); }, 650);

    if (pages <= 1) { pagerEl.innerHTML = ''; relLink('prev', 0); relLink('next', 0); return; }

    var info = 'Page ' + cur + ' of ' + pages + ' &middot; ' + pool.length + ' stories';
    var html = '<span class="vdy-pager__info">' + info + '</span><span class="vdy-pager__nums">';
    html += cur > 1
      ? '<a class="vdy-pager__btn" href="' + pageUrl(cur - 1) + '" data-page="' + (cur - 1) + '" aria-label="Previous page">&larr; Prev</a>'
      : '<span class="vdy-pager__btn" aria-disabled="true" style="opacity:.45;pointer-events:none;">&larr; Prev</span>';
    nums(cur, pages).forEach(function (n) {
      if (n === '…') { html += '<span class="vdy-pager__num" style="border:none;pointer-events:none;">…</span>'; return; }
      var active = n === cur;
      html += '<a class="vdy-pager__num' + (active ? ' vdy-pager__num--active" aria-current="page"' : '"') + ' href="' + pageUrl(n) + '" data-page="' + n + '">' + n + '</a>';
    });
    html += cur < pages
      ? '<a class="vdy-pager__btn" href="' + pageUrl(cur + 1) + '" data-page="' + (cur + 1) + '" aria-label="Next page">Next &rarr;</a>'
      : '<span class="vdy-pager__btn" aria-disabled="true" style="opacity:.45;pointer-events:none;">Next &rarr;</span>';
    html += '</span>';
    pagerEl.innerHTML = html;

    relLink('prev', cur - 1);
    relLink('next', cur + 1);
  }

  function go(n, push) {
    cur = Math.min(pages, Math.max(1, n));
    render();
    if (push) {
      try { history.pushState({ vdyPage: cur }, '', pageUrl(cur)); } catch (e) {}
    }
    var y = gridEl.getBoundingClientRect().top + window.pageYOffset - 90;
    if (Math.abs(window.pageYOffset - y) > 40) window.scrollTo({ top: y, behavior: 'smooth' });
  }

  pagerEl.addEventListener('click', function (e) {
    var a = e.target.closest('a[data-page]');
    if (!a) return;
    e.preventDefault();
    go(parseInt(a.getAttribute('data-page'), 10), true);
  });

  window.addEventListener('popstate', function () {
    var mm = /(?:^|[?&])page=(\d+)/.exec(location.search);
    go(mm ? parseInt(mm[1], 10) || 1 : 1, false);
  });

  render();
})();
