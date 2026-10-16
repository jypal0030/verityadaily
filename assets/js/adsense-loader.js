/* Veritya Daily - AdSense Loader (consent-gated, single-point config)
 * HOW TO ENABLE: replace ca-pub-XXXXXXXXXXXXXXXX with your real client ID after AdSense approval,
 * set ADS_ENABLED=true. Nothing else needs touching - this file is included sitewide.
 * If ADS_ENABLED=false this file is a harmless no-op. */
(function () {
  'use strict';
  var ADSENSE_CLIENT = 'ca-pub-XXXXXXXXXXXXXXXX';
  var ADS_ENABLED = false; // set true after pasting real client ID

  function mount() {
    if (!ADS_ENABLED || document.getElementById('vd-adsense-lib')) return;
    var s = document.createElement('script');
    s.id = 'vd-adsense-lib';
    s.async = true;
    s.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + ADSENSE_CLIENT;
    s.crossOrigin = 'anonymous';
    document.head.appendChild(s);
  }

  var stored = null;
  try { stored = localStorage.getItem('vd-cookie-consent'); } catch (e) {}
  if (stored === 'accepted') { mount(); return; }

  document.addEventListener('vd-consent', function (e) {
    if (e.detail === 'accepted') mount();
  });
})();
