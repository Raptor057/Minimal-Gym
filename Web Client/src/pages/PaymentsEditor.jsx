import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import api from '../api/axios.js'
import PageHeader from '../ui/PageHeader.jsx'

const emptyForm = {
  memberId: '',
  subscriptionId: '',
  paymentMethodId: '',
  amountUsd: '',
  paidAtUtc: '',
  reference: '',
  proofBase64: '',
  proofName: '',
}

export default function PaymentsEditor() {
  const [members, setMembers] = useState([])
  const [subscriptions, setSubscriptions] = useState([])
  const [plans, setPlans] = useState([])
  const [methods, setMethods] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [prefill, setPrefill] = useState({ memberId: '', subscriptionId: '', amountUsd: '' })
  const navigate = useNavigate()
  const location = useLocation()

  const loadMembers = async () => {
    const { data } = await api.get('/members')
    setMembers(Array.isArray(data) ? data : [])
  }

  const loadMethods = async () => {
    const { data } = await api.get('/payment-methods')
    setMethods(Array.isArray(data) ? data : [])
  }

  const loadPlans = async () => {
    const { data } = await api.get('/membership-plans')
    setPlans(Array.isArray(data) ? data : [])
  }

  const selectSubscription = (subscription, amountOverride) => {
    if (!subscription) {
      setForm((prev) => ({ ...prev, subscriptionId: '', amountUsd: '' }))
      return
    }
    setForm((prev) => ({
      ...prev,
      subscriptionId: String(subscription.id),
      amountUsd: amountOverride || String(subscription.priceUsd ?? ''),
    }))
  }

  const loadSubscriptions = async (memberId) => {
    if (!memberId) {
      setSubscriptions([])
      setForm((prev) => ({ ...prev, subscriptionId: '', amountUsd: '' }))
      return
    }
    const { data } = await api.get(`/members/${memberId}/subscriptions`)
    const list = Array.isArray(data) ? data : []
    setSubscriptions(list)

    const normalizedPrefill = prefill.subscriptionId ? Number(prefill.subscriptionId) : null
    const selected =
      (normalizedPrefill && list.find((sub) => sub.id === normalizedPrefill)) ||
      list.find((sub) => String(sub.status || '').toLowerCase() === 'active') ||
      list
        .slice()
        .sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime())[0]

    selectSubscription(selected, prefill.amountUsd ? String(prefill.amountUsd) : '')
  }

  useEffect(() => {
    setLoading(true)
    Promise.all([loadMembers(), loadMethods(), loadPlans()])
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const memberId = params.get('memberId') ?? ''
    const subscriptionId = params.get('subscriptionId') ?? ''
    const amountUsd = params.get('amount') ?? ''
    if (memberId || subscriptionId || amountUsd) {
      setPrefill({ memberId, subscriptionId, amountUsd })
      setForm((prev) => ({ ...prev, memberId }))
      if (memberId) {
        loadSubscriptions(memberId)
      }
    }
  }, [location.search])

  const selectedSubscription = useMemo(() => {
    if (!form.subscriptionId) return null
    return subscriptions.find((sub) => String(sub.id) === String(form.subscriptionId)) ?? null
  }, [form.subscriptionId, subscriptions])

  const selectedPlanName = useMemo(() => {
    if (!selectedSubscription) return '--'
    const plan = plans.find((entry) => entry.id === selectedSubscription.planId)
    return plan?.name ?? `Plan #${selectedSubscription.planId}`
  }, [plans, selectedSubscription])

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

      const method = methods.find((entry) => entry.id === Number(form.paymentMethodId))
      const isCash = method?.name?.toLowerCase() === 'cash'
      if (!isCash && !form.proofBase64) {
        setError('Proof is required for non-cash payments.')
        return
      }

      const payload = {
        paymentMethodId: Number(form.paymentMethodId),
        amountUsd: Number(form.amountUsd),
        paidAtUtc: form.paidAtUtc || null,
        reference: form.reference || null,
        proofBase64: form.proofBase64 || null,
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
                  setForm({ ...form, memberId: event.target.value, subscriptionId: '', amountUsd: '' })
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
                onChange={(event) => {
                  const nextId = event.target.value
                  const nextSubscription = subscriptions.find((sub) => String(sub.id) === String(nextId))
                  selectSubscription(nextSubscription)
                }}
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
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              <div>Plan: <span className="font-semibold text-slate-900">{selectedPlanName}</span></div>
              <div>Status: <span className="font-semibold text-slate-900">{selectedSubscription?.status ?? '--'}</span></div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Payment method
                </label>
                <select
                  value={form.paymentMethodId}
                  onChange={(event) =>
                    setForm({ ...form, paymentMethodId: event.target.value, proofBase64: '', proofName: '' })
                  }
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
            {(() => {
              const method = methods.find((entry) => entry.id === Number(form.paymentMethodId))
              const requiresProof = method && method.name?.toLowerCase() !== 'cash'
              if (!requiresProof) return null
              return (
                <div>
                  <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                    Proof (required)
                  </label>
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
                        setForm((prev) => ({
                          ...prev,
                          proofBase64: String(reader.result || ''),
                          proofName: file.name,
                        }))
                      }
                      reader.readAsDataURL(file)
                    }}
                    className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                  />
                  {form.proofName ? <p className="mt-1 text-xs text-slate-500">Selected: {form.proofName}</p> : null}
                </div>
              )
            })()}
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

















