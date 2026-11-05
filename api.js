/* 前端連後端的橋:讓網頁沿用原本的 google.script.run 寫法,實際改成呼叫 Supabase 上的 API */
(function () {
  var API = 'https://wgmbabfkuditzeiozfvz.supabase.co/functions/v1/api';
  window.COSCOS_API = API;
  function builder(s, f) {
    return new Proxy({}, {
      get: function (t, k) {
        if (k === 'withSuccessHandler') return function (fn) { return builder(fn, f); };
        if (k === 'withFailureHandler') return function (fn) { return builder(s, fn); };
        if (k === 'withUserObject') return function () { return builder(s, f); };
        if (typeof k !== 'string' || k === 'then') return undefined;
        return function () {
          var args = [].slice.call(arguments);
          fetch(API, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify({ fn: k, args: args }) })
            .then(function (r) { return r.json(); })
            .then(function (j) { if (j && j.ok) { if (s) s(j.result); } else if (f) f(new Error((j && j.error) || '發生錯誤,請稍後再試')); })
            .catch(function () { if (f) f(new Error('網路連線失敗,請稍後再試')); });
        };
      }
    });
  }
  window.google = { script: { run: builder(null, null) } };
})();
