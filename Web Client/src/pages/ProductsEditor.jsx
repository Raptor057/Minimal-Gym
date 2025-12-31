import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../api/axios.js'
import PageHeader from '../ui/PageHeader.jsx'

const emptyForm = {
  id: null,
  sku: '',
  barcode: '',
  name: '',
  salePriceUsd: '',
  costUsd: '',
  initialStock: '',
  category: '',
  photoBase64: '',
  isActive: true,
}

export default function ProductsEditor() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const [form, setForm] = useState(emptyForm)
  const [photoPreview, setPhotoPreview] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    if (!isEdit) {
      setForm(emptyForm)
      setPhotoPreview('')
      return
    }

    const loadProduct = async () => {
      setLoading(true)
      setError('')
      try {
        const { data } = await api.get(`/products/${id}`)
        setForm({
          id: data.id,
          sku: data.sku ?? '',
          barcode: data.barcode ?? '',
          name: data.name ?? '',
          salePriceUsd: data.salePriceUsd ?? '',
          costUsd: data.costUsd ?? '',
          initialStock: '',
          category: data.category ?? '',
          photoBase64: data.photoBase64 ?? '',
          isActive: data.isActive ?? true,
        })
        setPhotoPreview(data.photoBase64 ?? '')
      } catch (err) {
        setError(err?.response?.data ?? 'Unable to load product.')
      } finally {
        setLoading(false)
      }
    }

    loadProduct()
  }, [id, isEdit])

  const handleSave = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      if (!form.sku.trim() || !form.name.trim()) {
        setError('Sku and Name are required.')
        return
      }
      if (!form.salePriceUsd || Number(form.salePriceUsd) <= 0) {
        setError('Sale price must be greater than zero.')
        return
      }
      if (form.costUsd !== '' && Number(form.costUsd) < 0) {
        setError('Cost cannot be negative.')
        return
      }
      if (!isEdit && Number(form.initialStock) <= 0) {
        setError('Initial stock must be greater than zero.')
        return
      }

      const payload = {
        sku: form.sku.trim(),
        name: form.name.trim(),
        salePriceUsd: Number(form.salePriceUsd),
        costUsd: Number(form.costUsd || 0),
        initialStock: isEdit ? undefined : Number(form.initialStock),
        barcode: form.barcode || null,
        category: form.category || null,
        photoBase64: form.photoBase64 || null,
        isActive: form.isActive,
      }

      if (isEdit) {
        await api.put(`/products/${id}`, payload)
      } else {
        await api.post('/products', payload)
      }

      navigate('/products')
    } catch (err) {
      setError(err?.response?.data ?? 'Unable to save product.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Inventory"
        title={isEdit ? 'Edit product' : 'New product'}
        description="Inventory pricing and details."
        actions={
          <button
            onClick={() => navigate('/products')}
            className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
          >
            Back to products
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
          <div className="text-sm text-slate-500">Loading product...</div>
        ) : (
          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Name</label>
                <input
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                  className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">SKU</label>
                <input
                  value={form.sku}
                  onChange={(event) => setForm({ ...form, sku: event.target.value })}
                  className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Barcode</label>
                <input
                  value={form.barcode}
                  onChange={(event) => setForm({ ...form, barcode: event.target.value })}
                  className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Category</label>
                <input
                  value={form.category}
                  onChange={(event) => setForm({ ...form, category: event.target.value })}
                  className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Product photo</label>
              <div className="mt-2 flex flex-wrap items-center gap-4">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    if (!file) return
                    if (!file.type.startsWith('image/')) {
                      setError('Only image files are allowed.')
                      return
                    }
                    const reader = new FileReader()
                    reader.onload = () => {
                      const result = typeof reader.result === 'string' ? reader.result : ''
                      setForm((prev) => ({ ...prev, photoBase64: result }))
                      setPhotoPreview(result)
                    }
                    reader.readAsDataURL(file)
                  }}
                  className="block w-full max-w-sm text-sm text-slate-600 file:mr-4 file:rounded-full file:border-0 file:bg-slate-100 file:px-4 file:py-2 file:text-xs file:font-semibold file:uppercase file:tracking-[0.2em] file:text-slate-600"
                />
                <div className="flex items-center gap-3">
                  {photoPreview ? (
                    <img
                      src={photoPreview}
                      alt="Product preview"
                      className="h-14 w-14 rounded-lg object-cover ring-2 ring-indigo-500/30"
                    />
                  ) : (
                    <div className="h-14 w-14 rounded-lg bg-slate-100" />
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setForm((prev) => ({ ...prev, photoBase64: '' }))
                      setPhotoPreview('')
                    }}
                    className="text-xs font-semibold text-slate-500 hover:text-slate-900"
                  >
                    Clear photo
                  </button>
                </div>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Sale price (USD)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={form.salePriceUsd}
                  onChange={(event) => setForm({ ...form, salePriceUsd: event.target.value })}
                  className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Cost (USD)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={form.costUsd}
                  onChange={(event) => setForm({ ...form, costUsd: event.target.value })}
                  className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
            </div>
            {!isEdit ? (
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Initial stock
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={form.initialStock}
                  onChange={(event) => setForm({ ...form, initialStock: event.target.value })}
                  className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
            ) : null}
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
                onClick={() => navigate('/products')}
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {saving ? 'Saving...' : 'Save product'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
