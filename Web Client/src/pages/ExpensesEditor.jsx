import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios.js'
import PageHeader from '../ui/PageHeader.jsx'

export default function ExpensesEditor() {
  const [form, setForm] = useState({
    description: '',
    amountUsd: '',
    paymentMethodId: '',
    expenseDateUtc: '',
    notes: '',
    proofBase64: '',
    proofName: '',
  })
  const [methods, setMethods] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const loadMethods = async () => {
    const { data } = await api.get('/payment-methods')
    setMethods(Array.isArray(data) ? data : [])
  }

  useEffect(() => {
    loadMethods().catch(() => {})
  }, [])

  const handleSave = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      if (!form.description.trim()) {
        setError('Description is required.')
        return
      }
      if (!form.paymentMethodId) {
        setError('Select a payment method.')
        return
      }
      if (Number(form.amountUsd) <= 0) {
        setError('Amount must be greater than zero.')
        return
      }

      const method = methods.find((entry) => entry.id === Number(form.paymentMethodId))
      const isCash = method?.name?.toLowerCase() === 'cash'
      if (!isCash && !form.proofBase64) {
        setError('Proof is required for non-cash expenses.')
        return
      }

      const payload = {
        description: form.description.trim(),
        amountUsd: Number(form.amountUsd),
        paymentMethodId: Number(form.paymentMethodId),
        expenseDateUtc: form.expenseDateUtc ? new Date(form.expenseDateUtc).toISOString() : null,
        notes: form.notes?.trim() || null,
        proofBase64: form.proofBase64 || null,
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
              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Payment method</label>
              <select
                value={form.paymentMethodId}
                onChange={(event) =>
                  setForm({ ...form, paymentMethodId: event.target.value, proofBase64: '', proofName: '' })
                }
                className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="">Select method</option>
                {methods.filter((method) => method.isActive).map((method) => (
                  <option key={method.id} value={method.id}>
                    {method.name}
                  </option>
                ))}
              </select>
            </div>
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
            <div className="sm:col-span-2">
              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Expense date</label>
              <input
                type="datetime-local"
                value={form.expenseDateUtc}
                onChange={(event) => setForm({ ...form, expenseDateUtc: event.target.value })}
                className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
          </div>
          {(() => {
            const method = methods.find((entry) => entry.id === Number(form.paymentMethodId))
            const requiresProof = method && method.name?.toLowerCase() !== 'cash'
            if (!requiresProof) return null
            return (
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Proof (required)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    if (!file) {
                      setForm((prev) => ({ ...prev, proofBase64: '', proofName: '' }))
                      return
                    }
                    const reader = new FileReader()
                    reader.onload = () => {
                      setForm((prev) => ({ ...prev, proofBase64: String(reader.result || ''), proofName: file.name }))
                    }
                    reader.readAsDataURL(file)
                  }}
                  className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                />
                {form.proofName ? <p className="mt-1 text-xs text-slate-500">Selected: {form.proofName}</p> : null}
              </div>
            )
          })()}
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
