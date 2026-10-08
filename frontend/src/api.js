const BASE = import.meta.env.VITE_API_URL || "/api";
export const token = { get: () => localStorage.getItem("js_token"), set: (t) => localStorage.setItem("js_token", t), clear: () => localStorage.removeItem("js_token") };
export async function api(path, { method = "GET", body, form } = {}) {
  const headers = {}; if (token.get()) headers.Authorization = `Bearer ${token.get()}`;
  if (body) headers["Content-Type"] = "application/json";
  let res;
  try { res = await fetch(BASE + path, { method, headers, body: form || (body && JSON.stringify(body)) }); }
  catch { throw new Error("We couldn't reach JobSense. Please check your connection and retry."); }
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) { if (res.status === 401 && token.get()) { token.clear(); } throw new Error(data.error || "Something went wrong. Please try again."); }
  return data;
}
