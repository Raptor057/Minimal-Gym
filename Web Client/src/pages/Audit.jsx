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
  const [detailsRow, setDetailsRow] = useState(null)

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

  const parseData = (value) => {
    if (!value) return null
    if (typeof value === 'object') return value
    try {
      return JSON.parse(value)
    } catch {
      return null
    }
  }

  const downloadCsv = () => {
    if (rows.length === 0) return
    const header = ['Entity', 'Action', 'EntityId', 'UserId', 'CreatedAt', 'Data']
    const lines = rows.map((row) => {
      const data = row.dataJson ? row.dataJson.replace(/\\s+/g, ' ').trim() : ''
      return [
        row.entityName ?? '',
        row.action ?? '',
        row.entityId ?? '',
        row.userId ?? '',
        row.createdAtUtc ?? '',
        data,
      ]
        .map((value) => `"${String(value).replace(/\"/g, '\"\"')}"`)
        .join(',')
    })
    const csv = [header.join(','), ...lines].join('\\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'audit-log.csv'
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <PageHeader
        eyebrow="Admin"
        title="Log general"
        description="Track every change with timestamps and users."
        actions={
          <div className="flex flex-wrap gap-2">
            <button onClick={loadAudit} className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
              Refresh
            </button>
            <button
              onClick={downloadCsv}
              className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600"
            >
              Download CSV
            </button>
          </div>
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
              <th className="px-4 py-3 text-right">Data</th>
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
                  <td className="px-4 py-4 text-right">
                    <button
                      onClick={() => setDetailsRow(row)}
                      className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600"
                    >
                      Details
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {detailsRow ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-4 text-center sm:items-center">
          <div className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white p-6 text-left shadow-xl transition-all">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-display text-xl text-slate-900">Audit details</h3>
                <p className="mt-1 text-sm text-slate-500">Readable data snapshot.</p>
              </div>
              <button onClick={() => setDetailsRow(null)} className="text-sm text-slate-500 hover:text-slate-900">
                Close
              </button>
            </div>
            <div className="mt-6 space-y-2 text-sm text-slate-600">
              <div><span className="font-semibold text-slate-900">Entity:</span> {detailsRow.entityName}</div>
              <div><span className="font-semibold text-slate-900">Action:</span> {detailsRow.action}</div>
              <div><span className="font-semibold text-slate-900">Entity Id:</span> {detailsRow.entityId ?? '--'}</div>
              <div><span className="font-semibold text-slate-900">User:</span> {detailsRow.userId ?? '--'}</div>
              <div><span className="font-semibold text-slate-900">Created:</span> {detailsRow.createdAtUtc}</div>
            </div>
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              {(() => {
                const parsed = parseData(detailsRow.dataJson)
                if (!parsed) {
                  return <div>{detailsRow.dataJson ?? '--'}</div>
                }
                return (
                  <ul className="space-y-2">
                    {Object.entries(parsed).map(([key, value]) => (
                      <li key={key}>
                        <span className="font-semibold text-slate-900">{key}:</span> {String(value)}
                      </li>
                    ))}
                  </ul>
                )
              })()}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
