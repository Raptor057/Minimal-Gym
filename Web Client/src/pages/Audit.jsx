import { useState } from 'react'
import api from '../api/axios.js'
import PageHeader from '../ui/PageHeader.jsx'

export default function Audit() {
  const [filters, setFilters] = useState({
    entity: '',
    action: '',
    userId: '',
    from: '',
    to: '',
    limit: '100',
  })
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const loadAudit = async () => {
    setLoading(true)
    setError('')
    try {
      const params = {
        entity: filters.entity || undefined,
        action: filters.action || undefined,
        userId: filters.userId ? Number(filters.userId) : undefined,
        from: filters.from ? new Date(filters.from).toISOString() : undefined,
        to: filters.to ? new Date(filters.to).toISOString() : undefined,
        limit: Number(filters.limit || 100),
      }
      const { data } = await api.get('/audit', { params })
      setRows(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err?.response?.data ?? 'Unable to load audit logs.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Audit"
        title="Audit log"
        description="Track every change with timestamps and users."
        actions={
          <button onClick={loadAudit} className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
            Refresh
          </button>
        }
      />

      <div className="mt-6 grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-3 lg:grid-cols-6">
        <div>
          <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Entity</label>
          <input
            value={filters.entity}
            onChange={(event) => setFilters({ ...filters, entity: event.target.value })}
            className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Action</label>
          <input
            value={filters.action}
            onChange={(event) => setFilters({ ...filters, action: event.target.value })}
            className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">User Id</label>
          <input
            type="number"
            value={filters.userId}
            onChange={(event) => setFilters({ ...filters, userId: event.target.value })}
            className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">From (UTC)</label>
          <input
            type="datetime-local"
            value={filters.from}
            onChange={(event) => setFilters({ ...filters, from: event.target.value })}
            className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">To (UTC)</label>
          <input
            type="datetime-local"
            value={filters.to}
            onChange={(event) => setFilters({ ...filters, to: event.target.value })}
            className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Limit</label>
          <input
            type="number"
            min="1"
            max="500"
            value={filters.limit}
            onChange={(event) => setFilters({ ...filters, limit: event.target.value })}
            className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
          />
        </div>
      </div>

      {error ? (
        <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
          {String(error)}
        </div>
      ) : null}

      <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-[0.2em] text-slate-500">
            <tr>
              <th className="px-4 py-3">Entity</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Entity Id</th>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3">Data</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td className="px-4 py-6 text-sm text-slate-500" colSpan={6}>
                  Loading audit logs...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-sm text-slate-500" colSpan={6}>
                  No audit events found.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50/60">
                  <td className="px-4 py-4 text-slate-900">{row.entityName}</td>
                  <td className="px-4 py-4 text-slate-500">{row.action}</td>
                  <td className="px-4 py-4 text-slate-500">{row.entityId ?? '-'}</td>
                  <td className="px-4 py-4 text-slate-500">{row.userId ?? '-'}</td>
                  <td className="px-4 py-4 text-slate-500">{row.createdAtUtc}</td>
                  <td className="px-4 py-4 text-xs text-slate-400">{row.dataJson ?? '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
