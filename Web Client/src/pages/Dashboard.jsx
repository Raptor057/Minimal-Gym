import { useEffect, useState } from 'react'
import api from '../api/axios.js'
import PageHeader from '../ui/PageHeader.jsx'

const initialStats = {
  activeMembers: '--',
  todayCheckIns: '--',
  subscriptionsDue: '--',
  cashOpen: '--',
}

const getUtcDayRange = (date) => {
  const start = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  const end = start + 24 * 60 * 60 * 1000
  return { start, end }
}

export default function Dashboard() {
  const [stats, setStats] = useState(initialStats)
  const [error, setError] = useState('')

  useEffect(() => {
    let isMounted = true
    const load = async () => {
      setError('')
      try {
        const [membersRes, checkinsRes, cashRes] = await Promise.all([
          api.get('/members'),
          api.get('/checkins'),
          api.get('/cash/current').catch((err) => {
            if (err?.response?.status === 404) return { data: null }
            throw err
          }),
        ])

        const members = Array.isArray(membersRes.data) ? membersRes.data : []
        const activeMembers = members.filter((member) => member.isActive).length

        const checkins = Array.isArray(checkinsRes.data) ? checkinsRes.data : []
        const todayRange = getUtcDayRange(new Date())
        const todayCheckIns = checkins.filter((checkin) => {
          const timestamp = new Date(checkin.checkedInAtUtc).getTime()
          return timestamp >= todayRange.start && timestamp < todayRange.end
        }).length

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
    </div>
  )
}
