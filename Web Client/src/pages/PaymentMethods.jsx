import { useEffect, useMemo, useState } from 'react'
import api from '../api/axios.js'
import PageHeader from '../ui/PageHeader.jsx'

const emptyForm = { id: null, name: '', isActive: true }

export default function PaymentMethods() {
  const [methods, setMethods] = useState([])
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize] = useState(8)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const fetchMethods = async () => {
    setLoading(true)
    setError('')
    try {
      const { data } = await api.get('/payment-methods')
      setMethods(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err?.response?.data ?? 'Unable to load payment methods.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMethods()
  }, [])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return methods
    return methods.filter((method) => method.name?.toLowerCase().includes(term))
  }, [methods, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize)

  const openCreate = () => {
    setForm(emptyForm)
    setModalOpen(true)
  }

  const openEdit = (method) => {
    setForm({
      id: method.id,
      name: method.name ?? '',
      isActive: method.isActive ?? true,
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
        isActive: Boolean(form.isActive),
      }
      if (form.id) {
        await api.put(`/payment-methods/${form.id}`, payload)
      } else {
        await api.post('/payment-methods', payload)
      }
      await fetchMethods()
      closeModal()
    } catch (err) {
      setError(err?.response?.data ?? 'Unable to save payment method.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (methodId) => {
    if (!window.confirm('Delete this payment method?')) return
    try {
      await api.delete(`/payment-methods/${methodId}`)
      await fetchMethods()
    } catch (err) {
      setError(err?.response?.data ?? 'Unable to delete payment method.')
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Payments"
        title="Payment methods"
        description="Manage cash, card, transfer, and other payment options."
        actions={
          <button onClick={openCreate} className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
            New method
          </button>
        }
      />

      <div className="mt-6 flex flex-wrap items-center gap-4">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search payment methods..."
          className="h-10 w-full max-w-sm rounded-full border border-slate-200 bg-white px-4 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
        />
        <div className="text-sm text-slate-500">{filtered.length} methods</div>
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
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td className="px-4 py-6 text-sm text-slate-500" colSpan={3}>
                  Loading payment methods...
                </td>
              </tr>
            ) : paged.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-sm text-slate-500" colSpan={3}>
                  No payment methods found.
                </td>
              </tr>
            ) : (
              paged.map((method) => (
                <tr key={method.id} className="hover:bg-slate-50/60">
                  <td className="px-4 py-4 text-slate-900">{method.name}</td>
                  <td className="px-4 py-4 text-slate-500">{method.isActive ? 'Active' : 'Inactive'}</td>
                  <td className="px-4 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => openEdit(method)}
                        className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(method.id)}
                        className="rounded-full border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
        <button
          onClick={() => setPage((prev) => Math.max(1, prev - 1))}
          className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600"
          disabled={page === 1}
        >
          Prev
        </button>
        <span>
          Page {page} of {totalPages}
        </span>
        <button
          onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
          className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600"
          disabled={page === totalPages}
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
                  {form.id ? 'Edit payment method' : 'New payment method'}
                </h3>
                <p className="mt-1 text-sm text-slate-500">Add or update a payment option.</p>
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
              <label className="flex items-center gap-3 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(event) => setForm({ ...form, isActive: event.target.checked })}
                  className="h-4 w-4 rounded border-slate-300"
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
                  className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {saving ? 'Saving...' : 'Save method'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}
