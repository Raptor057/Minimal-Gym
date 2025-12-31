import { useEffect, useMemo, useState } from 'react'
import { Combobox, ComboboxButton, ComboboxInput, ComboboxOption, ComboboxOptions, Label } from '@headlessui/react'
import { ChevronDownIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/20/solid'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios.js'
import appVersion from '../../VERSION?raw'

const initialLogin = { userName: '', password: '' }
const initialSignup = {
  userName: '',
  password: '',
  fullName: '',
  email: '',
  phone: '',
  photoBase64: '',
}

export default function Login() {
  const [view, setView] = useState('login')
  const [loginForm, setLoginForm] = useState(initialLogin)
  const [signupForm, setSignupForm] = useState(initialSignup)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [showLoginPassword, setShowLoginPassword] = useState(false)
  const [showSignupPassword, setShowSignupPassword] = useState(false)
  const [photoPreview, setPhotoPreview] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [canCreateAdmin, setCanCreateAdmin] = useState(false)
  const [logo, setLogo] = useState('')
  const [users, setUsers] = useState([])
  const [query, setQuery] = useState('')
  const [selectedUser, setSelectedUser] = useState(null)
  const [apiVersion, setApiVersion] = useState('unknown')
  const navigate = useNavigate()

  const fetchBootstrapStatus = async () => {
    try {
      const response = await api.get('/bootstrap/status')
      setCanCreateAdmin(!response.data?.hasUsers)
      if (response.data?.hasUsers) {
        setView('login')
      }
    } catch {
      setCanCreateAdmin(false)
    }
  }

  const fetchUsers = async () => {
    try {
      const response = await api.get('/public/users')
      setUsers(Array.isArray(response.data) ? response.data : [])
    } catch {
      setUsers([])
    }
  }

  useEffect(() => {
    fetchBootstrapStatus()
  }, [])

  useEffect(() => {
    fetchUsers()
  }, [])

  useEffect(() => {
    let isMounted = true
    api
      .get('/health/version')
      .then((response) => {
        if (!isMounted) return
        setApiVersion(response.data?.version ?? 'unknown')
      })
      .catch(() => {
        if (isMounted) setApiVersion('unknown')
      })
    return () => {
      isMounted = false
    }
  }, [])

  const filteredUsers = useMemo(() => {
    if (!query.trim()) return users
    const term = query.trim().toLowerCase()
    return users.filter((user) => {
      return (
        user.fullName?.toLowerCase().includes(term) ||
        user.userName?.toLowerCase().includes(term)
      )
    })
  }, [query, users])

  useEffect(() => {
    let isMounted = true
    api
      .get('/config')
      .then((response) => {
        if (!isMounted) return
        setLogo(response.data?.logoBase64 ?? '')
      })
      .catch(() => {
        if (isMounted) setLogo('')
      })
    return () => {
      isMounted = false
    }
  }, [])

  const validateLogin = () => {
    const next = {}
    if (!loginForm.userName.trim()) next.userName = 'Username is required.'
    if (!loginForm.password.trim()) next.password = 'Password is required.'
    setFieldErrors(next)
    return Object.keys(next).length === 0
  }

  const validateSignup = () => {
    const next = {}
    if (!signupForm.fullName.trim()) next.fullName = 'Full name is required.'
    if (!signupForm.userName.trim()) next.userName = 'Username is required.'
    if (!signupForm.password.trim()) next.password = 'Password is required.'
    if (signupForm.email && !/^\S+@\S+\.\S+$/.test(signupForm.email)) {
      next.email = 'Email is not valid.'
    }
    if (signupForm.photoBase64 && !signupForm.photoBase64.startsWith('data:image/')) {
      next.photoBase64 = 'Photo must be a base64 data:image/* string.'
    }
    setFieldErrors(next)
    return Object.keys(next).length === 0
  }

  const handlePhotoUpload = (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setFieldErrors((prev) => ({ ...prev, photoBase64: 'Only image files are allowed.' }))
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : ''
      setSignupForm((prev) => ({ ...prev, photoBase64: result }))
      setPhotoPreview(result)
      setFieldErrors((prev) => ({ ...prev, photoBase64: undefined }))
    }
    reader.readAsDataURL(file)
  }

  const handleLogin = async (event) => {
    event.preventDefault()
    setError('')
    if (!validateLogin()) return
    setLoading(true)
    try {
      const { data } = await api.post('/auth/login', loginForm)
      localStorage.setItem('access_token', data.accessToken)
      localStorage.setItem('refresh_token', data.refreshToken)
      navigate('/dashboard')
    } catch (err) {
      setError(err?.response?.data ?? 'Login failed.')
    } finally {
      setLoading(false)
    }
  }

  const handleSignup = async (event) => {
    event.preventDefault()
    setError('')
    if (!validateSignup()) return
    setLoading(true)
    try {
      await api.post('/bootstrap/first-admin', {
        userName: signupForm.userName,
        password: signupForm.password,
        fullName: signupForm.fullName,
        email: signupForm.email || null,
        phone: signupForm.phone || null,
        photoBase64: signupForm.photoBase64 || null,
        isActive: true,
        isLocked: false,
      })
      setModalOpen(true)
      setSignupForm(initialSignup)
    } catch (err) {
      setError(err?.response?.data ?? 'Account creation failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-[#070a16] text-white">
      <div className="flex flex-1 flex-col justify-center px-6 py-12 lg:flex-none lg:px-20 xl:px-24">
        <div className="mx-auto w-full max-w-sm lg:w-96">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-500/30">
                {logo ? <img src={logo} alt="Logo" className="h-full w-full object-cover" /> : 'TB'}
              </div>
              <div className="text-xs uppercase tracking-[0.3em] text-slate-400">Team Beauty Brownsville</div>
            </div>
            <h2 className="mt-8 font-display text-2xl text-white">
              {view === 'login' ? 'Sign in to your account' : 'Create your admin account'}
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              {view === 'login'
                ? 'Use your admin credentials to access the gym console.'
                : 'This runs once to bootstrap the first admin account.'}
            </p>
          </div>

          <div className="mt-8 flex gap-3 rounded-full border border-slate-800 bg-slate-900/70 p-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            <button
              type="button"
              onClick={() => setView('login')}
              className={`flex-1 rounded-full px-4 py-2 ${
                view === 'login' ? 'bg-slate-100 text-slate-900 shadow-sm' : ''
              }`}
            >
              Sign in
            </button>
            {canCreateAdmin ? (
              <button
                type="button"
                onClick={() => setView('signup')}
                className={`flex-1 rounded-full px-4 py-2 ${
                  view === 'signup' ? 'bg-slate-100 text-slate-900 shadow-sm' : ''
                }`}
              >
                Create admin
              </button>
            ) : null}
          </div>

          {error ? (
            <div className="mt-6 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              {String(error)}
            </div>
          ) : null}

          {view === 'login' ? (
            <form onSubmit={handleLogin} className="mt-6 space-y-6">
              <div>
                <Combobox
                  as="div"
                  value={selectedUser}
                  onChange={(user) => {
                    setSelectedUser(user)
                    setQuery('')
                    setLoginForm({ ...loginForm, userName: user?.userName ?? '' })
                  }}
                >
                  <Label className="block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                    Username
                  </Label>
                  <div className="relative mt-2">
                    <ComboboxInput
                      className="block w-full rounded-md border border-slate-800 bg-slate-900/80 py-2 pr-10 pl-3 text-sm text-white outline-none focus:ring-2 focus:ring-indigo-500/40"
                      onChange={(event) => {
                        setQuery(event.target.value)
                        setSelectedUser(null)
                        setLoginForm({ ...loginForm, userName: event.target.value })
                      }}
                      onBlur={() => setQuery('')}
                      displayValue={(user) => user?.userName ?? loginForm.userName}
                      placeholder="Select user or type..."
                    />
                    <ComboboxButton className="absolute inset-y-0 right-0 flex items-center rounded-r-md px-2 focus:outline-none">
                      <ChevronDownIcon className="size-5 text-slate-400" aria-hidden="true" />
                    </ComboboxButton>

                    <ComboboxOptions className="absolute z-10 mt-2 max-h-56 w-full overflow-auto rounded-md border border-slate-800 bg-slate-950/95 py-1 text-sm text-slate-100 shadow-lg">
                      {query.length > 0 && (
                        <ComboboxOption
                          value={{ id: null, fullName: query, userName: query, photoBase64: '' }}
                          className="cursor-default px-3 py-2 text-slate-100 data-focus:bg-indigo-500 data-focus:text-white"
                        >
                          Use "{query}"
                        </ComboboxOption>
                      )}
                      {filteredUsers.map((user) => (
                        <ComboboxOption
                          key={user.id}
                          value={user}
                          className="cursor-default px-3 py-2 text-slate-100 data-focus:bg-indigo-500 data-focus:text-white"
                        >
                          <div className="flex items-center gap-3">
                            {user.photoBase64 ? (
                              <img
                                src={user.photoBase64}
                                alt=""
                                className="size-6 rounded-full bg-slate-800 outline -outline-offset-1 outline-black/5"
                              />
                            ) : (
                              <div className="size-6 rounded-full bg-slate-800" />
                            )}
                            <div>
                              <div className="text-sm font-medium">{user.fullName}</div>
                              <div className="text-xs text-slate-400">{user.userName}</div>
                            </div>
                          </div>
                        </ComboboxOption>
                      ))}
                    </ComboboxOptions>
                  </div>
                </Combobox>
                {fieldErrors.userName ? (
                  <p className="mt-2 text-xs text-rose-300">{fieldErrors.userName}</p>
                ) : null}
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Password
                </label>
                <div className="mt-2">
                  <input
                    type={showLoginPassword ? 'text' : 'password'}
                    value={loginForm.password}
                    onChange={(event) => setLoginForm({ ...loginForm, password: event.target.value })}
                    className="block w-full rounded-md border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-indigo-500/40"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setShowLoginPassword((prev) => !prev)}
                  className="mt-2 inline-flex items-center gap-2 rounded-full border border-slate-700 bg-transparent px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-200"
                >
                  {showLoginPassword ? <EyeSlashIcon className="size-4" /> : <EyeIcon className="size-4" />}
                  {showLoginPassword ? 'Hide password' : 'Show password'}
                </button>
                {fieldErrors.password ? (
                  <p className="mt-2 text-xs text-rose-300">{fieldErrors.password}</p>
                ) : null}
              </div>
              <button
                type="submit"
                disabled={loading}
                className="flex w-full justify-center rounded-md bg-[#87155f] px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#9a1a6c] disabled:opacity-60"
              >
                {loading ? 'Signing in...' : 'Sign in'}
              </button>
              <div className="text-xs text-slate-500">
                API {apiVersion} • Frontend {String(appVersion || '').trim() || 'unknown'}
              </div>
            </form>
          ) : (
            <form onSubmit={handleSignup} className="mt-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Full name
                </label>
                <div className="mt-2">
                  <input
                    value={signupForm.fullName}
                    onChange={(event) => setSignupForm({ ...signupForm, fullName: event.target.value })}
                    className="block w-full rounded-md border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-indigo-500/40"
                  />
                </div>
                {fieldErrors.fullName ? (
                  <p className="mt-2 text-xs text-rose-300">{fieldErrors.fullName}</p>
                ) : null}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                    Username
                  </label>
                  <div className="mt-2">
                    <input
                      value={signupForm.userName}
                      onChange={(event) => setSignupForm({ ...signupForm, userName: event.target.value })}
                      className="block w-full rounded-md border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-indigo-500/40"
                    />
                  </div>
                  {fieldErrors.userName ? (
                    <p className="mt-2 text-xs text-rose-300">{fieldErrors.userName}</p>
                  ) : null}
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                    Password
                  </label>
                  <div className="mt-2">
                    <input
                      type={showSignupPassword ? 'text' : 'password'}
                      value={signupForm.password}
                      onChange={(event) => setSignupForm({ ...signupForm, password: event.target.value })}
                      className="block w-full rounded-md border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-indigo-500/40"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowSignupPassword((prev) => !prev)}
                    className="mt-2 inline-flex items-center gap-2 rounded-full border border-slate-700 bg-transparent px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-200"
                  >
                    {showSignupPassword ? <EyeSlashIcon className="size-4" /> : <EyeIcon className="size-4" />}
                    {showSignupPassword ? 'Hide password' : 'Show password'}
                  </button>
                  {fieldErrors.password ? (
                    <p className="mt-2 text-xs text-rose-300">{fieldErrors.password}</p>
                  ) : null}
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                    Email (optional)
                  </label>
                  <div className="mt-2">
                    <input
                      type="email"
                      value={signupForm.email}
                      onChange={(event) => setSignupForm({ ...signupForm, email: event.target.value })}
                      className="block w-full rounded-md border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-indigo-500/40"
                    />
                  </div>
                  {fieldErrors.email ? <p className="mt-2 text-xs text-rose-300">{fieldErrors.email}</p> : null}
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                    Phone (optional)
                  </label>
                  <div className="mt-2">
                    <input
                      value={signupForm.phone}
                      onChange={(event) => setSignupForm({ ...signupForm, phone: event.target.value })}
                      className="block w-full rounded-md border border-slate-800 bg-slate-900/80 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-indigo-500/40"
                    />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Photo (optional)
                </label>
                <div className="mt-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="block w-full text-sm text-slate-300 file:mr-4 file:rounded-full file:border-0 file:bg-slate-800 file:px-4 file:py-2 file:text-xs file:font-semibold file:uppercase file:tracking-[0.2em] file:text-slate-200"
                  />
                </div>
                {photoPreview ? (
                  <img
                    src={photoPreview}
                    alt="Preview"
                    className="mt-3 h-16 w-16 rounded-full object-cover ring-2 ring-indigo-500/40"
                  />
                ) : null}
                {fieldErrors.photoBase64 ? (
                  <p className="mt-2 text-xs text-rose-300">{fieldErrors.photoBase64}</p>
                ) : null}
              </div>
              <button
                type="submit"
                disabled={loading}
                className="flex w-full justify-center rounded-md bg-[#87155f] px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#9a1a6c] disabled:opacity-60"
              >
                {loading ? 'Creating...' : 'Create admin'}
              </button>
              <div className="text-xs text-slate-500">
                API {apiVersion} • Frontend {String(appVersion || '').trim() || 'unknown'}
              </div>
            </form>
          )}
        </div>
      </div>
      <div className="relative hidden w-0 flex-1 lg:block">
        <img
          alt=""
          // src="https://images.unsplash.com/photo-1496917756835-20cb06e75b4e?auto=format&fit=crop&w=1908&q=80"
          //src="https://media.raptor-server-services.com/media/Gym-girl-2.jpg"
          src="https://media.raptor-server-services.com/media/gym-logo.jpg"
          className="absolute inset-0 h-full w-full object-cover opacity-75"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#070a16] via-slate-900/40 to-transparent" />
      </div>

      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#070a16]/85 p-4 text-center sm:items-center">
          <div className="w-full max-w-sm transform overflow-hidden rounded-lg border border-slate-800 bg-[#0c1122] px-4 pb-4 pt-5 text-left text-white shadow-xl transition-all sm:p-6">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20">
              <svg className="h-6 w-6 text-emerald-600" viewBox="0 0 24 24" fill="none">
                <path
                  d="M5 13l4 4L19 7"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div className="mt-3 text-center">
              <h3 className="text-base font-semibold text-white">Admin created</h3>
              <p className="mt-2 text-sm text-slate-300">
                You can now sign in with the new credentials.
              </p>
            </div>
            <div className="mt-5">
              <button
                type="button"
                onClick={() => {
                  setModalOpen(false)
                  setView('login')
                  fetchUsers()
                  fetchBootstrapStatus()
                  setSelectedUser(null)
                  setQuery('')
                  setLoginForm(initialLogin)
                }}
                className="inline-flex w-full justify-center rounded-md bg-[#87155f] px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#9a1a6c]"
              >
                Go to login
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
