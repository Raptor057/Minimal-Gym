import { useEffect, useState } from 'react'
import api from '../api/axios.js'
import PageHeader from '../ui/PageHeader.jsx'

export default function Config() {
  const [form, setForm] = useState({
    currencyCode: '',
    taxRate: '',
    receiptPrefix: '',
    nextReceiptNo: '',
  })
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  const loadConfig = async () => {
    setLoading(true)
    setError('')
    try {
      const { data } = await api.get('/config')
      setForm({
        currencyCode: data.currencyCode ?? '',
        taxRate: data.taxRate ?? '',
        receiptPrefix: data.receiptPrefix ?? '',
        nextReceiptNo: data.nextReceiptNo ?? '',
      })
    } catch (err) {
      setError(err?.response?.data ?? 'Unable to load config.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadConfig()
  }, [])

  const handleSave = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const taxRateValue = Number(form.taxRate || 0)
      const nextReceiptValue = Number(form.nextReceiptNo || 0)
      if (taxRateValue < 0) {
        setError('Tax rate cannot be negative.')
        return
      }
      if (nextReceiptValue < 0) {
        setError('Next receipt number cannot be negative.')
        return
      }

      await api.put('/config', {
        taxRate: taxRateValue,
        receiptPrefix: form.receiptPrefix?.trim() || null,
        nextReceiptNo: nextReceiptValue,
      })
      setMessage('Config updated.')
      await loadConfig()
    } catch (err) {
      setError(err?.response?.data ?? 'Unable to update config.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Admin"
        title="Configuration"
        description="Taxes, receipts, and defaults."
        actions={
          <button
            onClick={loadConfig}
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

      {message ? (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {message}
        </div>
      ) : null}

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
        {loading ? (
          <div className="text-sm text-slate-500">Loading config...</div>
        ) : (
          <form onSubmit={handleSave} className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Currency</label>
                <input
                  value={form.currencyCode}
                  readOnly
                  className="mt-2 w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Tax rate</label>
                <input
                  type="number"
                  step="0.0001"
                  value={form.taxRate}
                  onChange={(event) => setForm({ ...form, taxRate: event.target.value })}
                  className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Receipt prefix
                </label>
                <input
                  value={form.receiptPrefix}
                  onChange={(event) => setForm({ ...form, receiptPrefix: event.target.value })}
                  className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Next receipt number
                </label>
                <input
                  type="number"
                  step="1"
                  value={form.nextReceiptNo}
                  onChange={(event) => setForm({ ...form, nextReceiptNo: event.target.value })}
                  className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {saving ? 'Saving...' : 'Save changes'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
