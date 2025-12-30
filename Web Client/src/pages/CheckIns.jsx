import { useEffect, useMemo, useRef, useState } from 'react'
import { ClockIcon } from '@heroicons/react/20/solid'
import api from '../api/axios.js'
import PageHeader from '../ui/PageHeader.jsx'

const baseURL = import.meta.env.VITE_API_URL ?? '/api'

const formatLocalDateTime = (value) => {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return '--'
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

const daysBadgeClass = (days) => {
  if (!Number.isFinite(Number(days))) {
    return 'bg-gray-50 text-gray-600 inset-ring-gray-500/10 dark:bg-gray-400/10 dark:text-gray-400 dark:inset-ring-gray-400/20'
  }
  const value = Number(days)
  if (value <= 3) {
    return 'bg-red-50 text-red-700 inset-ring-red-600/10 dark:bg-red-400/10 dark:text-red-400 dark:inset-ring-red-400/20'
  }
  if (value <= 7) {
    return 'bg-yellow-50 text-yellow-800 inset-ring-yellow-600/20 dark:bg-yellow-400/10 dark:text-yellow-500 dark:inset-ring-yellow-400/20'
  }
  return 'bg-green-50 text-green-700 inset-ring-green-600/20 dark:bg-green-400/10 dark:text-green-400 dark:inset-ring-green-500/20'
}

export default function CheckIns() {
  const [checkins, setCheckins] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const lastRefreshAt = useRef(0)

  const loadToday = async () => {
    setLoading(true)
    setError('')
    try {
      const { data } = await api.get('/checkins/today')
      setCheckins(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err?.response?.data ?? 'Unable to load check-ins.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadToday()
  }, [])

  useEffect(() => {
    const normalizedBaseUrl = baseURL.endsWith('/') ? baseURL.slice(0, -1) : baseURL
    const streamUrl = `${normalizedBaseUrl}/checkins/stream`
    const source = new EventSource(streamUrl)

    source.onmessage = () => {
      const now = Date.now()
      if (now - lastRefreshAt.current < 1000) return
      lastRefreshAt.current = now
      loadToday()
    }

    return () => source.close()
  }, [])

  const todayCheckins = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return checkins
    return checkins.filter((checkin) => {
      return (
        checkin.fullName?.toLowerCase().includes(term) ||
        checkin.subscriptionStatus?.toLowerCase().includes(term)
      )
    })
  }, [checkins, search])

  return (
    <div>
      <PageHeader
        eyebrow="Check-ins"
        title="Daily check-ins"
        description="Today's member attendance list."
        actions={
          <button onClick={loadToday} className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
            Refresh
          </button>
        }
      />

      <div className="mt-6 flex flex-wrap items-center gap-4">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by name or status..."
          className="h-10 w-full max-w-sm rounded-full border border-slate-200 bg-white px-4 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
        />
        <div className="text-sm text-slate-500">{todayCheckins.length} check-ins today</div>
      </div>

      {error ? (
        <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
          {String(error)}
        </div>
      ) : null}

      {loading ? (
        <div className="mt-6 text-sm text-slate-500">Loading check-ins...</div>
      ) : todayCheckins.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-10 text-center text-sm text-slate-500">
          No check-ins for today yet.
        </div>
      ) : (
        <ul role="list" className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {todayCheckins.map((checkin) => {
            const imageUrl = checkin.photoBase64 ?? ''
            const daysText = Number.isFinite(Number(checkin.daysToExpire)) ? checkin.daysToExpire : '--'
            return (
              <li
                key={checkin.id}
                className="col-span-1 flex flex-col divide-y divide-slate-200 rounded-2xl bg-white text-center shadow-sm outline outline-1 outline-slate-200/50"
              >
                <div className="flex flex-1 flex-col p-6">
                  {imageUrl ? (
                    <img
                      alt=""
                      src={imageUrl}
                      className="mx-auto size-24 shrink-0 rounded-full bg-slate-100 outline -outline-offset-1 outline-black/5"
                    />
                  ) : (
                    <div className="mx-auto flex size-24 items-center justify-center rounded-full bg-slate-100 text-xl font-semibold text-slate-500">
                      {checkin.fullName?.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <h3 className="mt-4 text-sm font-semibold text-slate-900">{checkin.fullName}</h3>
                  <dl className="mt-1 flex grow flex-col justify-between text-sm text-slate-500">
                    <dt className="sr-only">Member status</dt>
                    <dd>{checkin.isActive ? 'Active member' : 'Inactive member'}</dd>
                    <dt className="sr-only">Subscription</dt>
                    <dd className="mt-3">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${
                          checkin.hasActiveSubscription
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-rose-50 text-rose-600'
                        }`}
                      >
                        {checkin.subscriptionStatus ?? 'No subscription'}
                      </span>
                    </dd>
                    <dt className="sr-only">Ends</dt>
                    <dd className="mt-3 text-xs text-slate-400">Ends: {checkin.subscriptionEndDate ?? '--'}</dd>
                    <dd className="mt-2 text-xs text-slate-400">
                      <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium inset-ring ${daysBadgeClass(daysText)}`}>
                        {Number.isFinite(Number(daysText)) ? `${daysText} days left` : 'Days left: --'}
                      </span>
                    </dd>
                  </dl>
                </div>
                <div className="border-t border-slate-200 px-6 py-3 text-center text-xs text-slate-500">
                  <span className="inline-flex items-center gap-2">
                    <ClockIcon aria-hidden="true" className="size-4 text-slate-400" />
                    {formatLocalDateTime(checkin.checkedInAtUtc)}
                  </span>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
