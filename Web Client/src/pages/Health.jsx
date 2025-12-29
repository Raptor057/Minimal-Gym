import { useEffect, useState } from 'react'
import api from '../api/axios.js'
import PageHeader from '../ui/PageHeader.jsx'

export default function Health() {
  const [status, setStatus] = useState('')
  const [utc, setUtc] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const loadHealth = async () => {
    setLoading(true)
    setError('')
    try {
      const { data } = await api.get('/health')
      setStatus(data?.status ?? 'unknown')
      setUtc(data?.utc ?? '')
    } catch (err) {
      setError(err?.response?.data ?? 'Unable to reach health endpoint.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadHealth()
  }, [])

  return (
    <div>
      <PageHeader
        eyebrow="System"
        title="API health"
        description="Quick connectivity check for the backend."
        actions={
          <button
            onClick={loadHealth}
            className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
          >
            Refresh
          </button>
        }
      />

      {error ? (
        <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
          {String(error)}
        </div>
      ) : null}

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
        {loading ? (
          <div className="text-sm text-slate-500">Checking health...</div>
        ) : (
          <div className="space-y-2 text-sm text-slate-600">
            <div>
              Status: <span className="font-semibold text-slate-900">{status || '--'}</span>
            </div>
            <div>
              UTC: <span className="font-semibold text-slate-900">{utc || '--'}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
