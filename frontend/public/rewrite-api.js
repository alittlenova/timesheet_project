// frontend/public/rewrite-api.js
// 在任何框架代码前加载：把指向 http://localhost:8000 或 127.0.0.1:8000 的请求强制改写为同域 /api/...
(function () {
  const needFix = (url) => /^https?:\/\/(localhost|127\.0\.0\.1):8000\//i.test(url);
  const toApi = (url) => {
    const path = url.replace(/^https?:\/\/[^/]+/i, ''); // 取出 /xxx
    // 防止 /api/api
    return '/api' + (path.startsWith('/api') ? path.replace(/^\/api/i, '') : path);
  };

  // fetch 重写
  const _fetch = window.fetch;
  window.fetch = function (input, init) {
    try {
      let url = typeof input === 'string' ? input : input && input.url;
      if (typeof url === 'string' && needFix(url)) {
        const fixed = toApi(url);
        console.warn('[REWRITE fetch]', url, '→', fixed);
        input = typeof input === 'string' ? fixed : new Request(fixed, input);
      }
    } catch {}
    return _fetch(input, init);
  };

  // XHR 重写（axios 等都会走这里）
  const _open = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    try {
      if (typeof url === 'string' && needFix(url)) {
        const fixed = toApi(url);
        console.warn('[REWRITE xhr]', url, '→', fixed);
        url = fixed;
      }
    } catch {}
    // @ts-ignore
    return _open.call(this, method, url, ...rest);
  };
})();
