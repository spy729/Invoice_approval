export async function apiFetch(path: string, options: RequestInit = {}) {
  const token = localStorage.getItem('workflow_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(path, { ...options, headers });
  const text = await res.text();
  try {
    const json = text ? JSON.parse(text) : null;
    if (!res.ok) throw json || { error: 'Request failed' };
    return json;
  } catch (err) {
    // If response wasn't JSON, rethrow status
    if (!res.ok) throw { error: text || 'Request failed' };
    return null;
  }
}

export default apiFetch;
