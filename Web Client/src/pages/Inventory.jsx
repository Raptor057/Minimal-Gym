import { useEffect, useMemo, useState } from 'react'
import api from '../api/axios.js'
import PageHeader from '../ui/PageHeader.jsx'

const emptyForm = {
  productId: '',
  movementType: 'In',
  quantity: '',
  unitCostUsd: '',
  notes: '',
}

const movementLabels = {
  In: 'Entry',
  Out: 'Exit',
  Adjust: 'Adjust',
  Waste: 'Waste',
}

export default function Inventory() {
  const [products, setProducts] = useState([])
  const [movements, setMovements] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  const fetchProducts = async () => {
    const { data } = await api.get('/products')
    setProducts(Array.isArray(data) ? data : [])
  }

  const fetchMovements = async () => {
    setLoading(true)
    setError('')
    try {
      const { data } = await api.get('/inventory/movements')
      setMovements(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err?.response?.data ?? 'Unable to load movements.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProducts()
    fetchMovements()
  }, [])

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return movements
    return movements.filter((movement) => {
      return (
        String(movement.productId).includes(term) ||
        movement.movementType?.toLowerCase().includes(term) ||
        movement.notes?.toLowerCase().includes(term)
      )
    })
  }, [search, movements])

  const openCreate = () => {
    setForm(emptyForm)
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
      if (!form.productId) {
        setError('Select a product.')
        return
      }
      if (!form.quantity || Number(form.quantity) <= 0) {
        setError('Quantity must be greater than zero.')
        return
      }

      const payload = {
        productId: Number(form.productId),
        movementType: form.movementType,
        quantity: Number(form.quantity),
        unitCostUsd: form.unitCostUsd ? Number(form.unitCostUsd) : null,
        notes: form.notes || null,
      }

      await api.post('/inventory/movements', payload)
      await fetchMovements()
      closeModal()
    } catch (err) {
      setError(err?.response?.data ?? 'Unable to create movement.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Inventory"
        title="Stock movements"
        description="Entries, exits, adjustments, and waste."
        actions={
          <button onClick={openCreate} className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">
            New movement
          </button>
        }
      />

      <div className="mt-6 flex flex-wrap items-center gap-4">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Filter by type, product id, notes..."
          className="h-10 w-full max-w-sm rounded-full border border-slate-200 bg-white px-4 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
        />
        <div className="text-sm text-slate-500">{filtered.length} movements</div>
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
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Quantity</th>
              <th className="px-4 py-3">Cost</th>
              <th className="px-4 py-3">Notes</th>
              <th className="px-4 py-3">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td className="px-4 py-6 text-sm text-slate-500" colSpan={6}>
                  Loading movements...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-sm text-slate-500" colSpan={6}>
                  No movements found.
                </td>
              </tr>
            ) : (
              filtered.map((movement) => (
                <tr key={movement.id} className="hover:bg-slate-50/60">
                  <td className="px-4 py-4 text-slate-900">#{movement.productId}</td>
                  <td className="px-4 py-4 text-slate-600">
                    {movementLabels[movement.movementType] ?? movement.movementType}
                  </td>
                  <td className="px-4 py-4 text-slate-600">{movement.quantity}</td>
                  <td className="px-4 py-4 text-slate-600">{movement.unitCostUsd ?? '—'}</td>
                  <td className="px-4 py-4 text-slate-500">{movement.notes ?? '—'}</td>
                  <td className="px-4 py-4 text-slate-400">{movement.createdAtUtc}</td>
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
                <h3 className="font-display text-xl text-slate-900">New movement</h3>
                <p className="mt-1 text-sm text-slate-500">Update inventory quantities.</p>
              </div>
              <button onClick={closeModal} className="text-sm text-slate-500 hover:text-slate-900">
                Close
              </button>
            </div>

            <form onSubmit={handleSave} className="mt-6 space-y-4">
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Product</label>
                <select
                  value={form.productId}
                  onChange={(event) => setForm({ ...form, productId: event.target.value })}
                  className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                >
                  <option value="">Select product</option>
                  {products.filter((p) => p.isActive).map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Type</label>
                  <select
                    value={form.movementType}
                    onChange={(event) => setForm({ ...form, movementType: event.target.value })}
                    className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                  >
                    {Object.keys(movementLabels).map((type) => (
                      <option key={type} value={type}>
                        {movementLabels[type]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Quantity</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.quantity}
                    onChange={(event) => setForm({ ...form, quantity: event.target.value })}
                    className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Unit cost (optional)</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.unitCostUsd}
                  onChange={(event) => setForm({ ...form, unitCostUsd: event.target.value })}
                  className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Notes</label>
                <textarea
                  rows={3}
                  value={form.notes}
                  onChange={(event) => setForm({ ...form, notes: event.target.value })}
                  className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                />
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
                  {saving ? 'Saving...' : 'Save movement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}
