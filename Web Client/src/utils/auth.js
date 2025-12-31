const parseJwtPayload = () => {
  const token = localStorage.getItem('access_token')
  if (!token) return null
  const parts = token.split('.')
  if (parts.length < 2) return null
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const json = decodeURIComponent(
      atob(base64)
        .split('')
        .map((char) => `%${(`00${char.charCodeAt(0).toString(16)}`).slice(-2)}`)
        .join('')
    )
    return JSON.parse(json)
  } catch {
    return null
  }
}

export const getAuthUserName = () => {
  const payload = parseJwtPayload()
  if (!payload) return null
  return payload.name || payload.unique_name || payload.sub || null
}

export const getAuthRoles = () => {
  const payload = parseJwtPayload()
  if (!payload) return []
  const roleClaim =
    payload.role ||
    payload.roles ||
    payload['http://schemas.microsoft.com/ws/2008/06/identity/claims/role']
  if (!roleClaim) return []
  return Array.isArray(roleClaim) ? roleClaim : [roleClaim]
}

export const isAdminRole = () => {
  return getAuthRoles().some((role) => String(role).toLowerCase() === 'admin')
}
