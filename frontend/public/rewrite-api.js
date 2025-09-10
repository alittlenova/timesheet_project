// frontend/public/rewrite-api.js
(function () {
  const PATTERNS = [
    /^http:\/\/localhost:8000/i,
    /^http:\/\/127\.0\.0\.1:8000/i,
    /^http:\/\/0\.0\.0\.0:8000/i,
  ];
  const toApi = (url) => {
    try {
      const s = String(url);
      for (const r of PATTERNS) {
        if (r.test(s)) {
          // http://localhost:8000/xxx  ->  /api/xxx
          return s.replace(r, '/api');
        }
      }
      return s;
    } catch {
      return url;
    }
  };

  // hook fetch
  const _fetch = window.fetch;
  window.fetch = function (input, init) {
    if (typeof input === 'string') {
      input = toApi(input);
    } else if (input && typeof input.url === 'string') {
      input = new Request(toApi(input.url), input);
    }
    return _fetch(input, init);
  };

  // hook XHR
  const _open = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    return _open.call(this, method, toApi(url), ...rest);
  };

  // 可选：在控制台打个标记，便于确认是否已加载
  window.__REWRITE_API_READY = true;
  console.log('[rewrite-api] hooked');
})();
