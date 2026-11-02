export const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api').replace(/\/$/, '');
export const getToken = () => sessionStorage.getItem('bloodlink_token');
export function setToken(token) {
  if (token) sessionStorage.setItem('bloodlink_token', token);
  else sessionStorage.removeItem('bloodlink_token');
}
// Accept existing absolute /api URLs as well as relative paths while pages are integrated.
export async function apiFetch(path, options = {}) {
  const relative = path.startsWith('http://localhost:5000/api') ? path.slice('http://localhost:5000/api'.length) : path;
  const url = /^https?:\/\//.test(relative) ? relative : API_URL + (relative.startsWith('/') ? relative : '/' + relative);
  const headers = new Headers(options.headers);
  const token = getToken();
  const isAuthRoute = path.includes('/auth/login') || path.includes('/auth/register');
  if (token && !isAuthRoute) headers.set('Authorization', 'Bearer ' + token);
  const response = await fetch(url, { ...options, headers });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const details = data.details?.map?.(d => d.field + ': ' + d.message).join('; ');
    const error = new Error(details || data.error || (response.status === 401 ? 'Invalid email or password' : 'Request failed'));
    error.status = response.status;
    if (response.status === 401 && token && !isAuthRoute) {
      setToken(null);
      window.dispatchEvent(new Event('bloodlink-session-expired'));
    }
    throw error;
  }
  return response;
}
export async function api(path, { body, ...options } = {}) {
  const response = await apiFetch(path, { ...options, ...(body === undefined ? {} : {
    body: JSON.stringify(body), headers: { 'Content-Type': 'application/json', ...options.headers }
  }) });
  return response.json();
}
// fetch streaming supports Authorization headers; browser EventSource cannot set them.
export async function subscribeNotifications(onNotification, signal, lastEventId) {
  const response = await apiFetch('/notifications/stream', { signal, headers: lastEventId ? { 'Last-Event-ID': lastEventId } : {} });
  const reader = response.body.getReader(), decoder = new TextDecoder();
  let buffer = '';
  try {
    while (!signal.aborted) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let end;
      while ((end = buffer.indexOf('\n\n')) !== -1) {
        const block = buffer.slice(0, end); buffer = buffer.slice(end + 2);
        if (block.includes('event: notification')) {
          const data = block.split('\n').find(line => line.startsWith('data: '));
          if (data) onNotification(JSON.parse(data.slice(6)));
        }
      }
    }
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
}
