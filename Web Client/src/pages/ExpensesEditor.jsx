import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios.js'
import PageHeader from '../ui/PageHeader.jsx'

export default function ExpensesEditor() {
  const [form, setForm] = useState({
    description: '',
    amountUsd: '',
    expenseDateUtc: '',
    notes: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleSave = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      if (!form.description.trim()) {
        setError('Description is required.')
        return
      }
      if (Number(form.amountUsd) <= 0) {
        setError('Amount must be greater than zero.')
        return
      }

      const payload = {
        description: form.description.trim(),
        amountUsd: Number(form.amountUsd),
        expenseDateUtc: form.expenseDateUtc ? new Date(form.expenseDateUtc).toISOString() : null,
        notes: form.notes?.trim() || null,
      }

      await api.post('/expenses', payload)
      navigate('/expenses')
    } catch (err) {
      setError(err?.response?.data ?? 'Unable to create expense.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Expenses"
        title="Add expense"
        description="Record a new expense."
        actions={
          <button
            onClick={() => navigate('/expenses')}
            className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
          >
            Back to expenses
          </button>
        }
      />

      {error ? (
        <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
          {String(error)}
        </div>
      ) : null}

      <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Description</label>
            <input
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
              className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Amount</label>
              <input
                type="number"
                step="0.01"
                value={form.amountUsd}
                onChange={(event) => setForm({ ...form, amountUsd: event.target.value })}
                className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Expense date</label>
              <input
                type="datetime-local"
                value={form.expenseDateUtc}
                onChange={(event) => setForm({ ...form, expenseDateUtc: event.target.value })}
                className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Notes</label>
            <input
              value={form.notes}
              onChange={(event) => setForm({ ...form, notes: event.target.value })}
              className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => navigate('/expenses')}
              className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
