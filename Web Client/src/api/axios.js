import axios from 'axios'

const baseURL = import.meta.env.VITE_API_URL ?? '/api'

const api = axios.create({
  baseURL,
  timeout: 15000,
})

const isoWithTimezone = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/
const localDateTime = /^\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}(?::\d{2})?$/
const localDateTimeDmy = /^\d{2}\/\d{2}\/\d{4}\s\d{2}:\d{2}(?::\d{2})?$/

const parseLocalDateTime = (value) => {
  if (localDateTime.test(value)) {
    const normalized = value.replace(' ', 'T')
    const date = new Date(normalized)
    return Number.isNaN(date.getTime()) ? null : date
  }
  if (localDateTimeDmy.test(value)) {
    const [datePart, timePart] = value.split(' ')
    const [day, month, year] = datePart.split('/').map(Number)
    const [hour, minute, second = '0'] = timePart.split(':')
    const date = new Date(year, month - 1, day, Number(hour), Number(minute), Number(second))
    return Number.isNaN(date.getTime()) ? null : date
  }
  return null
}

const formatLocalDateTime = (value) => {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const pad = (part) => String(part).padStart(2, '0')
  const month = pad(date.getMonth() + 1)
  const day = pad(date.getDate())
  const year = date.getFullYear()
  const hours = date.getHours()
  const minutes = pad(date.getMinutes())
  const hour12 = hours % 12 || 12
  const ampm = hours >= 12 ? 'PM' : 'AM'
  return `${month}/${day}/${year} ${hour12}:${minutes} ${ampm}`
}

const transformDates = (value, transform) => {
  if (typeof value === 'string') return transform(value)
  if (Array.isArray(value)) return value.map((item) => transformDates(item, transform))
  if (value && Object.prototype.toString.call(value) === '[object Object]') {
    return Object.entries(value).reduce((acc, [key, val]) => {
      acc[key] = transformDates(val, transform)
      return acc
    }, {})
  }
  return value
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  if (config.data && !(config.data instanceof FormData)) {
    config.data = transformDates(config.data, (value) => {
      const parsed = parseLocalDateTime(value)
      if (parsed) return parsed.toISOString()
      return value
    })
  }
  if (config.params) {
    config.params = transformDates(config.params, (value) => {
      const parsed = parseLocalDateTime(value)
      if (parsed) return parsed.toISOString()
      return value
    })
  }
  return config
})

let refreshPromise = null

const refreshAccessToken = () => {
  if (refreshPromise) return refreshPromise
  const refreshToken = localStorage.getItem('refresh_token')
  if (!refreshToken) {
    return Promise.reject(new Error('No refresh token.'))
  }
  refreshPromise = axios
    .post(`${baseURL}/auth/refresh`, { refreshToken })
    .then((response) => {
      localStorage.setItem('access_token', response.data.accessToken)
      localStorage.setItem('refresh_token', response.data.refreshToken)
      return response.data.accessToken
    })
    .finally(() => {
      refreshPromise = null
    })
  return refreshPromise
}

api.interceptors.response.use(
  (response) => {
    if (response?.data && !(response.data instanceof Blob)) {
      response.data = transformDates(response.data, (value) => {
        if (isoWithTimezone.test(value)) {
          return formatLocalDateTime(value)
        }
        const parsed = parseLocalDateTime(value)
        if (parsed) {
          return formatLocalDateTime(parsed)
        }
        return value
      })
    }
    return response
  },
  async (error) => {
    const original = error.config
    if (error?.response?.status === 401 && original && !original._retry) {
      original._retry = true
      try {
        const newToken = await refreshAccessToken()
        original.headers = original.headers ?? {}
        original.headers.Authorization = `Bearer ${newToken}`
        return api(original)
      } catch (refreshError) {
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        if (window.location.pathname !== '/login') {
          window.location.assign('/login')
        }
        return Promise.reject(refreshError)
      }
    }
    return Promise.reject(error)
  }
)

export default api
