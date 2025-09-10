// frontend/src/shim-api-rewrite.ts
(() => {
  const PATTERNS = [
    /^http:\/\/localhost:8000/i,
    /^http:\/\/127\.0\.0\.1:8000/i,
    /^http:\/\/0\.0\.0\.0:8000/i,
  ];

  const toApi = (url: any) => {
    try {
      const s = String(url);
      for (const r of PATTERNS) if (r.test(s)) return s.replace(r, "/api");
      return s;
    } catch {
      return url;
    }
  };

  // fetch 补丁
  const _fetch = window.fetch;
  window.fetch = function (input: any, init?: any) {
    if (typeof input === "string") {
      input = toApi(input);
    } else if (input && typeof input.url === "string") {
      input = new Request(toApi(input.url), input as any);
    }
    return _fetch(input, init as any);
  } as any;

  // XHR 补丁（axios 底层会走这个）
  const _open = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method: string, url: string, ...rest: any[]) {
    return _open.call(this, method, toApi(url), ...rest);
  };

  (window as any).__REWRITE_API_READY = true;
  console.log("[shim-api-rewrite] active");
})();
