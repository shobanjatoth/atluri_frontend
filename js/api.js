(function () {
  "use strict";
  const cfg = window.APP_CONFIG;
  // Ignore legacy shared sessions from earlier frontend versions.
  try { localStorage.removeItem("ascend_access_token"); localStorage.removeItem("ascend_current_user"); } catch (_) {}
  function portalRole() {
    const p = location.pathname.toLowerCase();
    if (p.includes("employee-")) return "employee";
    if (p.includes("security-")) return "security";
    if (p.includes("admin-login")) return "admin";
    return "admin";
  }
  function sessionKeys(role = portalRole()) {
    if (role === "employee") return { token: cfg.EMPLOYEE_TOKEN_KEY, user: cfg.EMPLOYEE_USER_KEY };
    if (role === "security") return { token: cfg.SECURITY_TOKEN_KEY, user: cfg.SECURITY_USER_KEY };
    return { token: cfg.ADMIN_TOKEN_KEY, user: cfg.ADMIN_USER_KEY };
  }
  async function request(path, options = {}) {
    const base = (cfg.API_BASE_URL || "").replace(/\/+$/, "");
    const headers = Object.assign({ Accept: "application/json" }, options.headers || {});
    if (options.body && !headers["Content-Type"]) headers["Content-Type"] = "application/json";
    // Login has no stored token yet. Every other page uses its own portal token.
    if (!path.endsWith("/api/auth/login")) {
      const keys = sessionKeys();
      const token = localStorage.getItem(keys.token);
      if (token) headers.Authorization = "Bearer " + token;
    }
    let response;
    try { response = await fetch(base + path, Object.assign({}, options, { headers, credentials: "omit" })); }
    catch (_) { throw new Error("Could not reach FastAPI. Check internet, backend availability, and CORS settings."); }
    const raw = await response.text();
    let data = null;
    if (raw) { try { data = JSON.parse(raw); } catch (_) { data = { message: raw }; } }
    if (!response.ok) {
      let detail = data && (data.detail || data.message || data.error);
      if (typeof detail === "object") detail = JSON.stringify(detail);
      if (response.status === 404 && typeof raw === "string" && /<!doctype html|<html/i.test(raw)) detail = "The deployed backend returned an HTML 404 for " + path + ". The live server may not have this route deployed yet, even if it appears in local /docs.";
      throw new Error(detail || ("Request failed (" + response.status + ")."));
    }
    return data;
  }
  window.API = {
    request,
    get: p => request(p, { method: "GET" }),
    post: (p, b) => request(p, { method: "POST", body: JSON.stringify(b || {}) }),
    put: (p, b) => request(p, { method: "PUT", body: JSON.stringify(b || {}) }),
    patch: (p, b) => request(p, { method: "PATCH", body: JSON.stringify(b || {}) }),
    del: p => request(p, { method: "DELETE" }),
    sessionKeys,
    portalRole
  };
})();
