import { useEffect, useMemo, useState } from 'react'
import api from '../api/axios.js'
import PageHeader from '../ui/PageHeader.jsx'

const emptyForm = {
  id: null,
  name: '',
  durationDays: '',
  priceUsd: '',
  rules: '',
  isActive: true,
}

export default function MembershipPlans() {
  const [plans, setPlans] = useState([])
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize] = useState(8)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const fetchPlans = async () => {
    setLoading(true)
    setError('')
    try {
      const { data } = await api.get('/membership-plans')
      setPlans(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err?.response?.data ?? 'Unable to load plans.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPlans()
  }, [])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return plans
    return plans.filter((plan) => {
      return plan.name?.toLowerCase().includes(term)
    })
  }, [search, plans])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize)

  const openCreate = () => {
    setForm(emptyForm)
    setModalOpen(true)
  }

  const openEdit = (plan) => {
    setForm({
      id: plan.id,
      name: plan.name ?? '',
      durationDays: plan.durationDays ?? '',
      priceUsd: plan.priceUsd ?? '',
      rules: plan.rules ?? '',
      isActive: plan.isActive ?? true,
    })
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
      if (!form.name.trim()) {
        setError('Name is required.')
        return
      }

      const payload = {
        name: form.name.trim(),
        durationDays: Number(form.durationDays),
        priceUsd: Number(form.priceUsd),
        rules: form.rules || null,
        isActive: form.isActive,
      }

      if (!payload.durationDays || payload.durationDays <= 0) {
        setError('Duration must be greater than zero.')
        return
      }
      if (!payload.priceUsd || payload.priceUsd <= 0) {
        setError('Price must be greater than zero.')
        return
      }

      if (form.id) {
        await api.put(`/membership-plans/${form.id}`, payload)
      } else {
        await api.post('/membership-plans', payload)
      }

      await fetchPlans()
      closeModal()
    } catch (err) {
      setError(err?.response?.data ?? 'Unable to save plan.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (planId) => {
    if (!window.confirm('Disable this plan?')) return
    try {
      await api.delete(`/membership-plans/${planId}`)
      await fetchPlans()
    } catch (err) {
      setError(err?.response?.data ?? 'Unable to delete plan.')
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Plans"
        title="Membership plans"
        description="Set pricing, duration, and plan rules."
        actions={
          <button onClick={openCreate} className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">
            New plan
          </button>
        }
      />

      <div className="mt-6 flex flex-wrap items-center gap-4">
        <input
          value={search}
          onChange={(event) => {
            setSearch(event.target.value)
            setPage(1)
          }}
          placeholder="Search plans..."
          className="h-10 w-full max-w-sm rounded-full border border-slate-200 bg-white px-4 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
        />
        <div className="text-sm text-slate-500">
          {filtered.length} plans • page {page} of {totalPages}
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
              <th className="px-4 py-3">Plan</th>
              <th className="px-4 py-3">Duration</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td className="px-4 py-6 text-sm text-slate-500" colSpan={5}>
                  Loading plans...
                </td>
              </tr>
            ) : paged.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-sm text-slate-500" colSpan={5}>
                  No plans found.
                </td>
              </tr>
            ) : (
              paged.map((plan) => (
                <tr key={plan.id} className="hover:bg-slate-50/60">
                  <td className="px-4 py-4">
                    <div className="font-semibold text-slate-900">{plan.name}</div>
                    <div className="text-xs text-slate-500">{plan.rules || 'No rules defined'}</div>
                  </td>
                  <td className="px-4 py-4 text-slate-600">{plan.durationDays} days</td>
                  <td className="px-4 py-4 text-slate-600">${plan.priceUsd}</td>
                  <td className="px-4 py-4">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        plan.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600'
                      }`}
                    >
                      {plan.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => openEdit(plan)}
                        className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(plan.id)}
                        className="rounded-full border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                      >
                        Disable
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-6 flex items-center justify-between text-sm text-slate-500">
        <button
          disabled={page <= 1}
          onClick={() => setPage((prev) => Math.max(1, prev - 1))}
          className="rounded-full border border-slate-200 px-4 py-2 disabled:opacity-50"
        >
          Prev
        </button>
        <button
          disabled={page >= totalPages}
          onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
          className="rounded-full border border-slate-200 px-4 py-2 disabled:opacity-50"
        >
          Next
        </button>
      </div>

      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-4 text-center sm:items-center">
          <div className="w-full max-w-lg transform overflow-hidden rounded-2xl bg-white p-6 text-left shadow-xl transition-all">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-display text-xl text-slate-900">
                  {form.id ? 'Edit plan' : 'Create plan'}
                </h3>
                <p className="mt-1 text-sm text-slate-500">Pricing and duration settings.</p>
              </div>
              <button onClick={closeModal} className="text-sm text-slate-500 hover:text-slate-900">
                Close
              </button>
            </div>

            <form onSubmit={handleSave} className="mt-6 space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Name</label>
                <input
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                  className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                    Duration (days)
                  </label>
                  <input
                    type="number"
                    value={form.durationDays}
                    onChange={(event) => setForm({ ...form, durationDays: event.target.value })}
                    className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Price (USD)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.priceUsd}
                    onChange={(event) => setForm({ ...form, priceUsd: event.target.value })}
                    className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Rules</label>
                <textarea
                  rows={3}
                  value={form.rules}
                  onChange={(event) => setForm({ ...form, rules: event.target.value })}
                  className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(event) => setForm({ ...form, isActive: event.target.checked })}
                />
                Active
              </label>
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
                  {saving ? 'Saving...' : 'Save plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}
