/* 前端連後端的橋:讓網頁沿用原本的 google.script.run 寫法,實際改成呼叫 Supabase 上的 API */
(function () {
  var API = 'https://wgmbabfkuditzeiozfvz.supabase.co/functions/v1/api';
  window.COSCOS_API = API;
  var WAIT = {}, READ = /^(admin(Init|Orders|Products|PurchaseList|StockView|Report|Settings|Levels|Vendors|Brands|Cats|Carriers|Members|MemberGrants|Logs|Codes|Activities|LineHistory|LineInfo|ShipHistory|ShipQuote|ProxyQuote|HistBindList|Admins)|member(Orders|ShipQuote|Login)|quote|getShop|shopData|trackLink|lineLiff|lineStart|lineCallback)$/;
  function builder(s, f) {
    return new Proxy({}, {
      get: function (t, k) {
        if (k === 'withSuccessHandler') return function (fn) { return builder(fn, f); };
        if (k === 'withFailureHandler') return function (fn) { return builder(s, fn); };
        if (k === 'withUserObject') return function () { return builder(s, f); };
        if (typeof k !== 'string' || k === 'then') return undefined;
        return function () {
          var args = [].slice.call(arguments), key = k + '|' + JSON.stringify(args), w = WAIT[key];
          // 防呆:同一個動作(同函式、同參數)還在處理中,或剛成功不久,就不重複送出,直接沿用同一次的結果
          if (w) { if (w.done) { if (w.ok && s) s(w.res); else if (!w.ok && f) f(w.err); } else w.cb.push({ s: s, f: f }); return; }
          w = WAIT[key] = { cb: [{ s: s, f: f }], done: false };
          var fin = function (ok, v) {
            w.done = true; w.ok = ok; w[ok ? 'res' : 'err'] = v;
            w.cb.forEach(function (c) { if (ok) { if (c.s) c.s(v); } else if (c.f) c.f(v); });
            w.cb = [];
            setTimeout(function () { if (WAIT[key] === w) delete WAIT[key]; }, ok && !READ.test(k) ? 3000 : 0);
          };
          fetch(API, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify({ fn: k, args: args }) })
            .then(function (r) { return r.json(); })
            .then(function (j) { if (j && j.ok) fin(true, j.result); else fin(false, new Error((j && j.error) || '發生錯誤,請稍後再試')); })
            .catch(function () { fin(false, new Error('網路連線失敗,請稍後再試')); });
        };
      }
    });
  }
  window.google = { script: { run: builder(null, null) } };
})();
