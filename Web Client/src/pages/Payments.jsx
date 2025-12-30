import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios.js'
import PageHeader from '../ui/PageHeader.jsx'

export default function Payments() {
  const [members, setMembers] = useState([])
  const [payments, setPayments] = useState([])
  const [selectedMemberId, setSelectedMemberId] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const loadMembers = async () => {
    const { data } = await api.get('/members')
    setMembers(Array.isArray(data) ? data : [])
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
    loadPayments('')
  }, [])

  useEffect(() => {
    if (selectedMemberId) {
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

  return (
    <div>
      <PageHeader
        eyebrow="Payments"
        title="Subscription payments"
        description="Track all membership payments in USD."
        actions={
          <button
            onClick={() => navigate('/payments/new')}
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
    </div>
  )
}
