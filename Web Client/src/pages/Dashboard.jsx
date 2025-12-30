import { useEffect, useRef, useState } from 'react'
import { Transition } from '@headlessui/react'
import api from '../api/axios.js'
import PageHeader from '../ui/PageHeader.jsx'

const baseURL = import.meta.env.VITE_API_URL ?? '/api'

const initialStats = {
  activeMembers: '--',
  todayCheckIns: '--',
  subscriptionsDue: '--',
  cashOpen: '--',
}

const getLocalDayRange = (date) => {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
  const end = start + 24 * 60 * 60 * 1000
  return { start, end }
}

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

export default function Dashboard() {
  const [stats, setStats] = useState(initialStats)
  const [error, setError] = useState('')
  const [members, setMembers] = useState([])
  const [showNotification, setShowNotification] = useState(false)
  const [notification, setNotification] = useState(null)
  const lastNotifiedId = useRef(null)
  const hasInitialized = useRef(false)
  const todayCheckinIds = useRef(new Set())
  const lastRefreshAt = useRef(0)

  const showCheckInNotification = (payload) => {
    if (!payload?.id || lastNotifiedId.current === payload.id) return
    lastNotifiedId.current = payload.id
    setNotification(payload)
    setShowNotification(true)
  }

  const applyRealtimeCheckIn = (payload) => {
    if (!payload?.id || !payload?.checkedInAtUtc) return
    if (todayCheckinIds.current.has(payload.id)) return

    const now = new Date()
    const todayRange = getLocalDayRange(now)
    const timestamp = new Date(payload.checkedInAtUtc).getTime()
    if (timestamp < todayRange.start || timestamp >= todayRange.end) return

    todayCheckinIds.current.add(payload.id)
    setStats((prev) => {
      const current = Number(prev.todayCheckIns) || 0
      return { ...prev, todayCheckIns: String(current + 1) }
    })
  }

  useEffect(() => {
    let isMounted = true
    const load = async () => {
      setError('')
      try {
        const [membersRes, checkinsRes, todayRes, cashRes] = await Promise.all([
          api.get('/members'),
          api.get('/checkins'),
          api.get('/checkins/today'),
          api.get('/cash/current').catch((err) => {
            if (err?.response?.status === 404) return { data: null }
            throw err
          }),
        ])

        const members = Array.isArray(membersRes.data) ? membersRes.data : []
        if (isMounted) {
          setMembers(members)
        }
        const activeMembers = members.filter((member) => member.isActive).length

        const checkins = Array.isArray(checkinsRes.data) ? checkinsRes.data : []
        const todayList = Array.isArray(todayRes.data) ? todayRes.data : []
        const todayCheckIns = todayList.length
        todayCheckinIds.current = new Set(todayList.map((checkin) => checkin.id))
        const todayRange = getLocalDayRange(new Date())

        const dueWindowStart = todayRange.start
        const dueWindowEnd = dueWindowStart + 7 * 24 * 60 * 60 * 1000
        const dueReport = await api.get('/reports/subscriptions/due', {
          params: {
            from: new Date(dueWindowStart).toISOString(),
            to: new Date(dueWindowEnd).toISOString(),
          },
        })
        const subscriptionsDue = Number(dueReport.data?.count ?? 0)

        const cashOpen = cashRes.data ? 'Yes' : 'No'

        if (isMounted) {
          setStats({
            activeMembers: String(activeMembers),
            todayCheckIns: String(todayCheckIns),
            subscriptionsDue: String(subscriptionsDue),
            cashOpen,
          })
        }

        if (!hasInitialized.current) {
          const latest = findLatestCheckinToday(checkins)
          lastNotifiedId.current = latest?.id ?? null
          hasInitialized.current = true
        }
      } catch (err) {
        if (isMounted) {
          setError(err?.response?.data ?? 'Unable to load dashboard stats.')
        }
      }
    }

    load()
    return () => {
      isMounted = false
    }
  }, [])

  const refreshRealtimeStats = async () => {
    const now = Date.now()
    if (now - lastRefreshAt.current < 2000) return
    lastRefreshAt.current = now
    try {
      const [cashRes, dueRes, membersRes] = await Promise.all([
        api.get('/cash/current').catch((err) => {
          if (err?.response?.status === 404) return { data: null }
          throw err
        }),
        api.get('/reports/subscriptions/due', {
          params: (() => {
            const todayRange = getLocalDayRange(new Date())
            const dueWindowStart = todayRange.start
            const dueWindowEnd = dueWindowStart + 7 * 24 * 60 * 60 * 1000
            return {
              from: new Date(dueWindowStart).toISOString(),
              to: new Date(dueWindowEnd).toISOString(),
            }
          })(),
        }),
        api.get('/members'),
      ])

      const cashOpen = cashRes.data ? 'Yes' : 'No'
      const subscriptionsDue = Number(dueRes.data?.count ?? 0)
      const membersList = Array.isArray(membersRes.data) ? membersRes.data : []
      setMembers(membersList)
      const activeMembers = membersList.filter((member) => member.isActive).length
      setStats((prev) => ({
        ...prev,
        cashOpen,
        subscriptionsDue: String(subscriptionsDue),
        activeMembers: String(activeMembers),
      }))
    } catch {
      // Ignore refresh errors.
    }
  }

  useEffect(() => {
    let isMounted = true
    const pollCheckins = async () => {
      try {
        const { data } = await api.get('/checkins')
        const checkins = Array.isArray(data) ? data : []
        const latest = findLatestCheckinToday(checkins)
        if (!latest || !isMounted) return

        if (lastNotifiedId.current !== latest.id) {
          const member = members.find((item) => item.id === latest.memberId)
          showCheckInNotification({
            id: latest.id,
            memberId: latest.memberId,
            name: member?.fullName ?? `Member #${latest.memberId}`,
            imageUrl: member?.photoBase64 ?? latest.memberPhotoBase64 ?? '',
            checkedInAtUtc: latest.checkedInAtUtc,
          })
        }
      } catch {
        // Ignore polling errors.
      }
    }

    const interval = setInterval(pollCheckins, 10000)
    return () => {
      isMounted = false
      clearInterval(interval)
    }
  }, [members])

  useEffect(() => {
    const normalizedBaseUrl = baseURL.endsWith('/') ? baseURL.slice(0, -1) : baseURL
    const streamUrl = `${normalizedBaseUrl}/checkins/stream`
    const source = new EventSource(streamUrl)

    source.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data)
        const mapped = {
          id: payload.id,
          memberId: payload.memberId,
          name: payload.fullName ?? payload.name,
          imageUrl: payload.photoBase64 ?? payload.imageUrl ?? '',
          checkedInAtUtc: payload.checkedInAtUtc,
        }
        showCheckInNotification(mapped)
        applyRealtimeCheckIn(mapped)
        refreshRealtimeStats()
      } catch {
        // Ignore malformed payloads.
      }
    }

    source.onerror = () => {
      // Keep polling as fallback.
    }

    return () => source.close()
  }, [])

  const cards = [
    { label: 'Active members', value: stats.activeMembers },
    { label: 'Today check-ins', value: stats.todayCheckIns },
    { label: 'Subscriptions due', value: stats.subscriptionsDue },
    { label: 'Cash open', value: stats.cashOpen },
  ]

  return (
    <div>
      <PageHeader
        eyebrow="Overview"
        title="Gym Control Center"
        description="Quick pulse of members, subscriptions, and sales."
      />

      {error ? (
        <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
          {String(error)}
        </div>
      ) : null}

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
            <div className="text-xs uppercase tracking-[0.2em] text-slate-400">{stat.label}</div>
            <div className="mt-3 text-2xl font-semibold text-slate-900">{stat.value}</div>
          </div>
        ))}
      </div>

      <div
        aria-live="assertive"
        className="pointer-events-none fixed inset-0 z-50 flex items-end px-4 py-6 sm:items-start sm:p-6"
      >
        <div className="flex w-full flex-col items-center space-y-4 sm:items-end">
          <Transition show={showNotification}>
            <div className="pointer-events-auto flex w-full max-w-md rounded-lg bg-white shadow-lg outline-1 outline-black/5 transition data-closed:opacity-0 data-enter:transform data-enter:duration-300 data-enter:ease-out data-closed:data-enter:translate-y-2 data-leave:duration-100 data-leave:ease-in data-closed:data-enter:sm:translate-x-2 data-closed:data-enter:sm:translate-y-0">
              <div className="w-0 flex-1 p-4">
                <div className="flex items-start">
                  <div className="shrink-0 pt-0.5">
                    {notification?.imageUrl ? (
                      <img
                        alt=""
                        src={notification.imageUrl}
                        className="size-10 rounded-full bg-gray-100 outline -outline-offset-1 outline-black/5"
                      />
                    ) : (
                      <div className="size-10 rounded-full bg-slate-200" />
                    )}
                  </div>
                  <div className="ml-3 w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900">{notification?.name ?? 'Member check-in'}</p>
                    <p className="mt-1 text-sm text-gray-500">
                      Checked in at {formatLocalDateTime(notification?.checkedInAtUtc)}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex border-l border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowNotification(false)}
                  className="flex w-full items-center justify-center rounded-none rounded-r-lg p-4 text-sm font-medium text-indigo-600 hover:text-indigo-500 focus:outline-2 focus:outline-indigo-500"
                >
                  Close
                </button>
              </div>
            </div>
          </Transition>
        </div>
      </div>
    </div>
  )
}

function findLatestCheckinToday(checkins) {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const end = start + 24 * 60 * 60 * 1000
  const today = checkins.filter((checkin) => {
    const timestamp = new Date(checkin.checkedInAtUtc).getTime()
    return timestamp >= start && timestamp < end
  })
  return today.sort((a, b) => b.id - a.id)[0] ?? null
}
