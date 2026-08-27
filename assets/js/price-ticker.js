/* Veritya Daily - live price ticker (Binance public API, no key) */
(function () {
  var COINS = [
    { s: 'BTCUSDT', n: 'BTC' },
    { s: 'ETHUSDT', n: 'ETH' },
    { s: 'SOLUSDT', n: 'SOL' },
    { s: 'XRPUSDT', n: 'XRP' }
  ];
  function fmt(p) {
    if (p >= 1000) return '$' + Math.round(p).toLocaleString('en-US');
    return '$' + p.toFixed(2);
  }
  function render(data) {
    var el = document.getElementById('priceTicker');
    if (!el) return;
    el.innerHTML = data.map(function (c) {
      var up = c.pct >= 0;
      return '<span class="ticker-item">' + c.n + ' ' + fmt(c.price) +
        ' <span class="' + (up ? 'ticker-up' : 'ticker-down') + '">' + (up ? '\u25B2' : '\u25BC') + Math.abs(c.pct).toFixed(2) + '%</span></span>';
    }).join('');
  }
  render([
    { n: 'BTC', price: 78801, pct: -0.38 },
    { n: 'ETH', price: 2493, pct: 1.15 },
    { n: 'SOL', price: 102, pct: 4.68 },
    { n: 'XRP', price: 1.00, pct: -2.61 }
  ]);
  try {
    var q = encodeURIComponent(JSON.stringify(COINS.map(function (c) { return c.s; })));
    fetch('https://api.binance.com/api/v3/ticker/24hr?symbols=' + q)
      .then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); })
      .then(function (arr) {
        render(arr.map(function (t, i) {
          return { n: COINS[i].n, price: +t.lastPrice, pct: +(+t.priceChangePercent).toFixed(2) };
        }));
      })
      .catch(function () { });
  } catch (e) { }
})();
