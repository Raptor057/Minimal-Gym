import { useEffect, useState } from 'react'
import api from '../api/axios.js'
import PageHeader from '../ui/PageHeader.jsx'

export default function Reports() {
  const [range, setRange] = useState({ from: '', to: '' })
  const [threshold, setThreshold] = useState('5')
  const [revenue, setRevenue] = useState(null)
  const [sales, setSales] = useState(null)
  const [subscriptionStatus, setSubscriptionStatus] = useState([])
  const [lowStock, setLowStock] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const now = new Date()
    const fromDate = new Date()
    fromDate.setDate(now.getDate() - 30)
    setRange({
      from: fromDate.toISOString().slice(0, 16),
      to: now.toISOString().slice(0, 16),
    })
  }, [])

  const runReports = async () => {
    setLoading(true)
    setError('')
    try {
      const fromUtc = range.from ? new Date(range.from).toISOString() : null
      const toUtc = range.to ? new Date(range.to).toISOString() : null
      if (!fromUtc || !toUtc) {
        setError('Select a valid from/to range.')
        return
      }
      const [revenueRes, salesRes, statusRes, lowStockRes] = await Promise.all([
        api.get('/reports/revenue', { params: { from: fromUtc, to: toUtc } }),
        api.get('/reports/sales', { params: { from: fromUtc, to: toUtc } }),
        api.get('/reports/subscriptions/status'),
        api.get('/reports/inventory/low-stock', { params: { threshold: Number(threshold || 5) } }),
      ])

      setRevenue(revenueRes.data)
      setSales(salesRes.data)
      setSubscriptionStatus(Array.isArray(statusRes.data) ? statusRes.data : [])
      setLowStock(Array.isArray(lowStockRes.data) ? lowStockRes.data : [])
    } catch (err) {
      setError(err?.response?.data ?? 'Unable to load reports.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Reports"
        title="Performance snapshots"
        description="Revenue, subscriptions, and low stock."
        actions={
          <button onClick={runReports} className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
            Run report
          </button>
        }
      />

      <div className="mt-6 grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-4">
        <div>
          <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">From (UTC)</label>
          <input
            type="datetime-local"
            value={range.from}
            onChange={(event) => setRange({ ...range, from: event.target.value })}
            className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">To (UTC)</label>
          <input
            type="datetime-local"
            value={range.to}
            onChange={(event) => setRange({ ...range, to: event.target.value })}
            className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Low stock threshold</label>
          <input
            type="number"
            step="1"
            value={threshold}
            onChange={(event) => setThreshold(event.target.value)}
            className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
          />
        </div>
        <div className="flex items-end">
          <button
            onClick={runReports}
            className="w-full rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
          >
            Refresh data
          </button>
        </div>
      </div>

      {error ? (
        <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
          {String(error)}
        </div>
      ) : null}

      {loading ? <div className="mt-6 text-sm text-slate-500">Loading reports...</div> : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Revenue</p>
          <p className="mt-3 text-2xl font-semibold text-slate-900">
            {revenue ? `$${revenue.totalUsd}` : '--'}
          </p>
          <div className="mt-4 space-y-1 text-sm text-slate-500">
            <div>Subscriptions: {revenue ? `$${revenue.subscriptionPaymentsUsd}` : '--'}</div>
            <div>Sales: {revenue ? `$${revenue.salesPaymentsUsd}` : '--'}</div>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Sales</p>
          <p className="mt-3 text-2xl font-semibold text-slate-900">{sales ? sales.count : '--'}</p>
          <div className="mt-4 text-sm text-slate-500">
            Total: {sales ? `$${sales.totalUsd}` : '--'}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Subscriptions</p>
          <div className="mt-4 space-y-2 text-sm text-slate-500">
            {subscriptionStatus.length === 0 ? (
              <div>No data.</div>
            ) : (
              subscriptionStatus.map((row) => (
                <div key={row.status} className="flex items-center justify-between">
                  <span>{row.status}</span>
                  <span className="font-semibold text-slate-700">{row.count}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Low stock</h3>
            <p className="text-xs text-slate-500">Products below the selected threshold.</p>
          </div>
        </div>
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-[0.2em] text-slate-500">
            <tr>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">SKU</th>
              <th className="px-4 py-3">Stock</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {lowStock.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-sm text-slate-500" colSpan={3}>
                  No low stock items.
                </td>
              </tr>
            ) : (
              lowStock.map((item) => (
                <tr key={item.productId} className="hover:bg-slate-50/60">
                  <td className="px-4 py-4 text-slate-900">{item.productName}</td>
                  <td className="px-4 py-4 text-slate-500">{item.sku ?? '-'}</td>
                  <td className="px-4 py-4 text-slate-500">{item.stock}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
