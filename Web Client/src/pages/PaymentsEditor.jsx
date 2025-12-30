import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios.js'
import PageHeader from '../ui/PageHeader.jsx'

const emptyForm = {
  memberId: '',
  subscriptionId: '',
  paymentMethodId: '',
  amountUsd: '',
  paidAtUtc: '',
  reference: '',
}

export default function PaymentsEditor() {
  const [members, setMembers] = useState([])
  const [subscriptions, setSubscriptions] = useState([])
  const [methods, setMethods] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const loadMembers = async () => {
    const { data } = await api.get('/members')
    setMembers(Array.isArray(data) ? data : [])
  }

  const loadMethods = async () => {
    const { data } = await api.get('/payment-methods')
    setMethods(Array.isArray(data) ? data : [])
  }

  const loadSubscriptions = async (memberId) => {
    if (!memberId) {
      setSubscriptions([])
      return
    }
    const { data } = await api.get(`/members/${memberId}/subscriptions`)
    setSubscriptions(Array.isArray(data) ? data : [])
  }

  useEffect(() => {
    setLoading(true)
    Promise.all([loadMembers(), loadMethods()])
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      if (!form.subscriptionId) {
        setError('Select a subscription.')
        return
      }
      if (!form.paymentMethodId) {
        setError('Select a payment method.')
        return
      }
      if (!form.amountUsd || Number(form.amountUsd) <= 0) {
        setError('Amount must be greater than zero.')
        return
      }

      const payload = {
        paymentMethodId: Number(form.paymentMethodId),
        amountUsd: Number(form.amountUsd),
        paidAtUtc: form.paidAtUtc || null,
        reference: form.reference || null,
      }

      await api.post(`/subscriptions/${form.subscriptionId}/payments`, payload)
      navigate('/payments')
    } catch (err) {
      setError(err?.response?.data ?? 'Unable to record payment.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Payments"
        title="Record payment"
        description="Register a payment in USD."
        actions={
          <button
            onClick={() => navigate('/payments')}
            className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
          >
            Back to payments
          </button>
        }
      />

      {error ? (
        <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
          {String(error)}
        </div>
      ) : null}

      <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        {loading ? (
          <div className="text-sm text-slate-500">Loading payment form...</div>
        ) : (
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Member</label>
              <select
                value={form.memberId}
                onChange={(event) => {
                  setForm({ ...form, memberId: event.target.value, subscriptionId: '' })
                  loadSubscriptions(event.target.value)
                }}
                className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="">Select member</option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.fullName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Subscription</label>
              <select
                value={form.subscriptionId}
                onChange={(event) => setForm({ ...form, subscriptionId: event.target.value })}
                className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="">Select subscription</option>
                {subscriptions.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    Plan #{sub.planId} - {sub.status}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Payment method
                </label>
                <select
                  value={form.paymentMethodId}
                  onChange={(event) => setForm({ ...form, paymentMethodId: event.target.value })}
                  className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                >
                  <option value="">Select method</option>
                  {methods.filter((m) => m.isActive).map((method) => (
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
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Paid at (UTC)
                </label>
                <input
                  type="datetime-local"
                  value={form.paidAtUtc}
                  onChange={(event) => setForm({ ...form, paidAtUtc: event.target.value })}
                  className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Reference</label>
                <input
                  value={form.reference}
                  onChange={(event) => setForm({ ...form, reference: event.target.value })}
                  className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => navigate('/payments')}
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {saving ? 'Saving...' : 'Save payment'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
