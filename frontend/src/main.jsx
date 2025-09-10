// frontend/src/main.jsx  —— 直接整文件替换

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// ===== 全局兜底：把任何指向 http://localhost:8000 或 127.0.0.1:8000 的请求重写为同域 /api =====
(() => {
  // 1) 拦截 fetch
  const origFetch = window.fetch;
  window.fetch = function(input, init) {
    try {
      let url = typeof input === 'string' ? input : input?.url;
      if (typeof url === 'string' &&
          /^https?:\/\/(localhost|127\.0\.0\.1):8000\//i.test(url)) {
        const path = url.replace(/^https?:\/\/[^/]+/i, ''); // => /auth/login
        const fixed = '/api' + (path.startsWith('/api') ? path.replace(/^\/api/i, '') : path);
        console.warn('[FETCH REWRITE]', url, '→', fixed);
        if (typeof input === 'string') input = fixed;
        else input = new Request(fixed, input);
      }
    } catch {}
    return origFetch(input, init);
  };

  // 2) 拦截 XHR
  const origOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function(method, url, ...rest) {
    try {
      if (typeof url === 'string' &&
          /^https?:\/\/(localhost|127\.0\.0\.1):8000\//i.test(url)) {
        const path = url.replace(/^https?:\/\/[^/]+/i, '');
        const fixed = '/api' + (path.startsWith('/api') ? path.replace(/^\/api/i, '') : path);
        console.warn('[XHR REWRITE]', url, '→', fixed);
        url = fixed;
      }
    } catch {}
    // @ts-ignore
    return origOpen.call(this, method, url, ...rest);
  };
})();
// ===== 兜底结束 =====

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
