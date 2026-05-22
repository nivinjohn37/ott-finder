import axios from 'axios'
import { signOut } from 'firebase/auth'
import { auth } from '@/lib/firebase'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ? `${import.meta.env.VITE_API_BASE_URL}/api` : '/api',
  timeout: 30_000,
})

api.interceptors.request.use(async (config) => {
  const user = auth.currentUser
  if (user) {
    const token = await user.getIdToken()
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    // If the server rejected the token (blacklisted user, revoked token), sign out immediately
    // so the UI doesn't stay in a "logged in" state while every API call fails.
    if (err.response?.status === 401 && auth.currentUser) {
      signOut(auth).catch(() => {})
    }
    // Attach a human-readable message but preserve the full axios error so callers
    // can still read err.response.data.error.code for specific error handling.
    err.message = err.response?.data?.error?.message ?? err.message
    return Promise.reject(err)
  }
)

export default api
