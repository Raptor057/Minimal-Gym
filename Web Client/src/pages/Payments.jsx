import { useEffect, useMemo, useState } from 'react'
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

export default function Payments() {
  const [members, setMembers] = useState([])
  const [subscriptions, setSubscriptions] = useState([])
  const [methods, setMethods] = useState([])
  const [payments, setPayments] = useState([])
  const [selectedMemberId, setSelectedMemberId] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

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

  const loadPayments = async (memberId) => {
    setLoading(true)
    setError('')
    try {
      const url = memberId ? `/members/${memberId}/payments` : '/payments'
      const { data } = await api.get(url)
      setPayments(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err?.response?.data ?? 'Unable to load payments.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadMembers()
    loadMethods()
    loadPayments('')
  }, [])

  useEffect(() => {
    if (selectedMemberId) {
      loadSubscriptions(selectedMemberId)
      loadPayments(selectedMemberId)
    }
  }, [selectedMemberId])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return payments
    return payments.filter((payment) => {
      return String(payment.id).includes(term) || payment.status?.toLowerCase().includes(term)
    })
  }, [search, payments])

  const openCreate = () => {
    setForm({ ...emptyForm, memberId: selectedMemberId || '' })
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setForm(emptyForm)
  }

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
      await loadPayments(selectedMemberId || '')
      closeModal()
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
        title="Subscription payments"
        description="Track all membership payments in USD."
        actions={
          <button
            onClick={openCreate}
            className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white"
          >
            Record payment
          </button>
        }
      />

      <div className="mt-6 flex flex-wrap items-center gap-4">
        <select
          value={selectedMemberId}
          onChange={(event) => setSelectedMemberId(event.target.value)}
          className="h-10 w-full max-w-xs rounded-full border border-slate-200 bg-white px-4 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
        >
          <option value="">All members</option>
          {members.map((member) => (
            <option key={member.id} value={member.id}>
              {member.fullName}
            </option>
          ))}
        </select>
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Filter by status or id..."
          className="h-10 w-full max-w-xs rounded-full border border-slate-200 bg-white px-4 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
        />
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
              <th className="px-4 py-3">Payment</th>
              <th className="px-4 py-3">Method</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Paid at</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td className="px-4 py-6 text-sm text-slate-500" colSpan={5}>
                  Loading payments...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-sm text-slate-500" colSpan={5}>
                  No payments found.
                </td>
              </tr>
            ) : (
              filtered.map((payment) => (
                <tr key={payment.id} className="hover:bg-slate-50/60">
                  <td className="px-4 py-4 text-slate-900">#{payment.id}</td>
                  <td className="px-4 py-4 text-slate-600">{payment.paymentMethodId}</td>
                  <td className="px-4 py-4">
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                      {payment.status}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-slate-600">${payment.amountUsd}</td>
                  <td className="px-4 py-4 text-slate-500">{payment.paidAtUtc}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-4 text-center sm:items-center">
          <div className="w-full max-w-lg transform overflow-hidden rounded-2xl bg-white p-6 text-left shadow-xl transition-all">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-display text-xl text-slate-900">Record payment</h3>
                <p className="mt-1 text-sm text-slate-500">Register a payment in USD.</p>
              </div>
              <button onClick={closeModal} className="text-sm text-slate-500 hover:text-slate-900">
                Close
              </button>
            </div>

            <form onSubmit={handleSave} className="mt-6 space-y-4">
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
                      Plan #{sub.planId} • {sub.status}
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
                  onClick={closeModal}
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
          </div>
        </div>
      ) : null}
    </div>
  )
}
