/* Veritya Daily - Cookie Consent Banner (GDPR-safe: ad scripts wait for choice) */
(function () {
  'use strict';
  var KEY = 'vd-cookie-consent';
  var stored = null;
  try { stored = localStorage.getItem(KEY); } catch (e) {}

  function emit(choice) {
    try { document.dispatchEvent(new CustomEvent('vd-consent', { detail: choice })); } catch (e) {}
  }

  function style() {
    var s = document.createElement('style');
    s.textContent =
      '#vd-consent{position:fixed;left:16px;right:16px;bottom:16px;z-index:99990;max-width:720px;margin:0 auto;' +
      'background:rgba(11,16,32,.97);color:#e2e8f0;border:1px solid rgba(99,102,241,.35);border-radius:14px;' +
      'padding:16px 18px;box-shadow:0 12px 40px rgba(0,0,0,.45);font-family:inherit;font-size:14px;line-height:1.55;' +
      'display:flex;gap:16px;align-items:center;flex-wrap:wrap}' +
      '#vd-consent .vd-cc-txt{flex:1 1 320px;min-width:260px;margin:0}' +
      '#vd-consent a{color:#818cf8;text-decoration:underline}' +
      '#vd-consent .vd-cc-btn{flex:0 0 auto;display:flex;gap:8px}' +
      '#vd-consent button{cursor:pointer;border-radius:9px;padding:9px 18px;font-size:13.5px;font-weight:600;border:1px solid transparent}' +
      '#vd-consent .vd-cc-yes{background:#4f46e5;color:#fff}' +
      '#vd-consent .vd-cc-yes:hover{background:#4338ca}' +
      '#vd-consent .vd-cc-no{background:transparent;color:#94a3b8;border-color:#334155}' +
      '#vd-consent .vd-cc-no:hover{color:#e2e8f0;border-color:#475569}' +
      '@media(max-width:560px){#vd-consent{left:10px;right:10px;bottom:10px;padding:14px}}';
    document.head.appendChild(s);
  }

  function save(choice) {
    try { localStorage.setItem(KEY, choice); } catch (e) {}
    var el = document.getElementById('vd-consent');
    if (el) el.remove();
    emit(choice);
  }

  function show() {
    if (document.getElementById('vd-consent')) return;
    style();
    var bar = document.createElement('div');
    bar.id = 'vd-consent';
    bar.setAttribute('role', 'dialog');
    bar.setAttribute('aria-label', 'Cookie consent');
    bar.innerHTML =
      '<p class="vd-cc-txt">We use cookies for analytics and to show relevant ads. ' +
      'See our <a href="/cookie-policy">Cookie Policy</a>.</p>' +
      '<div class="vd-cc-btn">' +
      '<button type="button" class="vd-cc-yes" aria-label="Accept cookies">Accept</button>' +
      '<button type="button" class="vd-cc-no" aria-label="Reject non-essential cookies">Reject</button>' +
      '</div>';
    bar.querySelector('.vd-cc-yes').addEventListener('click', function () { save('accepted'); });
    bar.querySelector('.vd-cc-no').addEventListener('click', function () { save('rejected'); });
    document.body.appendChild(bar);
  }

  if (stored === 'accepted' || stored === 'rejected') { emit(stored); }
  else if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', show);
  } else { show(); }
})();
