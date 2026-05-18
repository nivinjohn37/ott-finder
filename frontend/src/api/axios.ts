import axios from 'axios'
import { auth } from '@/lib/firebase'

const api = axios.create({
  baseURL: '/api',
  timeout: 10_000,
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
    const message = err.response?.data?.error?.message ?? err.message
    return Promise.reject(new Error(message))
  }
)

export default api
