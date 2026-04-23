const API_URL = process.env.NEXT_PUBLIC_VPS_API_URL || ''
const API_SECRET = process.env.API_SECRET || ''

async function request(path: string, options: RequestInit = {}) {
  const res = await fetch(`${API_URL}/api${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'x-api-secret': API_SECRET,
      ...options.headers
    }
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(err.error || `HTTP ${res.status}`)
  }
  return res.json()
}

export const api = {
  get: (path: string) => request(path),
  post: (path: string, body?: object) => request(path, { method: 'POST', body: JSON.stringify(body) }),
  put: (path: string, body?: object) => request(path, { method: 'PUT', body: JSON.stringify(body) })
}