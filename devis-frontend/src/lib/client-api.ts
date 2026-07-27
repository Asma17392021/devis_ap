import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'

// Empty by default: same-origin, proxied to the backend via next.config.mjs rewrites.
// Set NEXT_PUBLIC_API_URL locally (.env.local) to hit a backend directly instead.
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? ''

export const clientApi = axios.create({
  baseURL: `${API_URL}/api`,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
})

// ─── Token in-memory ─────────────────────────────────────────────────────────

let _clientAccessToken: string | null = null

export function getClientAccessToken() { return _clientAccessToken }
export function setClientAccessToken(t: string | null) { _clientAccessToken = t }
export function clearClientAccessToken() { _clientAccessToken = null }

// ─── Request interceptor ─────────────────────────────────────────────────────

clientApi.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getClientAccessToken()
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// ─── Response interceptor — auto-refresh on 401 ──────────────────────────────

let isRefreshing = false
let pendingQueue: Array<{ resolve: (t: string) => void; reject: (e: unknown) => void }> = []

function processQueue(error: unknown, token: string | null = null) {
  pendingQueue.forEach(({ resolve, reject }) => error ? reject(error) : resolve(token!))
  pendingQueue = []
}

clientApi.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const orig = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

    if (
      error.response?.status !== 401 ||
      orig._retry ||
      orig.url?.includes('/client-auth/refresh') ||
      orig.url?.includes('/client-auth/login')
    ) {
      return Promise.reject(error)
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        pendingQueue.push({ resolve, reject })
      }).then((token) => {
        orig.headers!.Authorization = `Bearer ${token}`
        return clientApi(orig)
      })
    }

    orig._retry = true
    isRefreshing = true

    try {
      const { data } = await clientApi.post<{ data: { accessToken: string } }>('/client-auth/refresh')
      const newToken = data.data.accessToken
      setClientAccessToken(newToken)
      processQueue(null, newToken)
      orig.headers!.Authorization = `Bearer ${newToken}`
      return clientApi(orig)
    } catch (refreshError) {
      processQueue(refreshError, null)
      clearClientAccessToken()
      if (typeof window !== 'undefined') {
        window.location.href = '/client/login'
      }
      return Promise.reject(refreshError)
    } finally {
      isRefreshing = false
    }
  }
)
