import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  withCredentials: false
})

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('sb_token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('sb_token')
      window.location.href = '/signin'
    }
    return Promise.reject(err)
  }
)

export default api
