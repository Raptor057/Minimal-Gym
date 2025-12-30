import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../api/axios.js'
import PageHeader from '../ui/PageHeader.jsx'

const emptyForm = {
  id: null,
  fullName: '',
  phone: '',
  email: '',
  birthDate: '',
  emergencyContact: '',
  notes: '',
  photoBase64: '',
  isActive: true,
}

const toInputDateValue = (value) => {
  if (!value) return ''
  if (typeof value !== 'string') return ''
  const isoDate = /^\d{4}-\d{2}-\d{2}/
  if (isoDate.test(value)) {
    return value.slice(0, 10)
  }
  const usDate = /^(\d{2})\/(\d{2})\/(\d{4})/
  const match = value.match(usDate)
  if (match) {
    const [, month, day, year] = match
    return `${year}-${month}-${day}`
  }
  return ''
}

export default function MembersEditor() {
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

    const loadMember = async () => {
      setLoading(true)
      setError('')
      try {
        const { data } = await api.get(`/members/${id}`)
        setForm({
          id: data.id,
          fullName: data.fullName ?? '',
          phone: data.phone ?? '',
          email: data.email ?? '',
          birthDate: toInputDateValue(data.birthDate),
          emergencyContact: data.emergencyContact ?? '',
          notes: data.notes ?? '',
          photoBase64: data.photoBase64 ?? '',
          isActive: data.isActive ?? true,
        })
        setPhotoPreview(data.photoBase64 ?? '')
      } catch (err) {
        setError(err?.response?.data ?? 'Unable to load member.')
      } finally {
        setLoading(false)
      }
    }

    loadMember()
  }, [id, isEdit])

  const handlePhotoUpload = (event) => {
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
  }

  const handleSave = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      if (!form.fullName.trim()) {
        setError('FullName is required.')
        return
      }

      const payload = {
        fullName: form.fullName.trim(),
        phone: form.phone || null,
        email: form.email || null,
        birthDate: form.birthDate || null,
        emergencyContact: form.emergencyContact || null,
        notes: form.notes || null,
        photoBase64: form.photoBase64 || null,
        isActive: form.isActive,
      }

      if (isEdit) {
        await api.put(`/members/${id}`, payload)
      } else {
        await api.post('/members', payload)
      }

      navigate('/members')
    } catch (err) {
      setError(err?.response?.data ?? 'Unable to save member.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Members"
        title={isEdit ? 'Edit member' : 'New member'}
        description="Update member profile and status."
        actions={
          <button
            onClick={() => navigate('/members')}
            className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700"
          >
            Back to members
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
          <div className="text-sm text-slate-500">Loading member...</div>
        ) : (
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Full name</label>
              <input
                value={form.fullName}
                onChange={(event) => setForm({ ...form, fullName: event.target.value })}
                className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm({ ...form, email: event.target.value })}
                  className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Phone</label>
                <input
                  value={form.phone}
                  onChange={(event) => setForm({ ...form, phone: event.target.value })}
                  className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Birth date
                </label>
                <input
                  type="date"
                  value={form.birthDate}
                  onChange={(event) => setForm({ ...form, birthDate: event.target.value })}
                  className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Emergency contact
                </label>
                <input
                  value={form.emergencyContact}
                  onChange={(event) => setForm({ ...form, emergencyContact: event.target.value })}
                  className="mt-2 w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
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
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Photo (optional)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="mt-2 block w-full text-sm text-slate-600 file:mr-4 file:rounded-full file:border-0 file:bg-slate-100 file:px-4 file:py-2 file:text-xs file:font-semibold file:uppercase file:tracking-[0.2em] file:text-slate-600"
                />
              </div>
              <div className="flex items-center gap-3">
                {photoPreview ? (
                  <img
                    src={photoPreview}
                    alt="Preview"
                    className="h-14 w-14 rounded-full object-cover ring-2 ring-indigo-500/30"
                  />
                ) : (
                  <div className="h-14 w-14 rounded-full bg-slate-100" />
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
                onClick={() => navigate('/members')}
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              >
                {saving ? 'Saving...' : 'Save member'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
