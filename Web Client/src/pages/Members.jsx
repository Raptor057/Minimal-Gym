import { useEffect, useMemo, useState } from 'react'
import { Combobox, ComboboxInput, ComboboxOption, ComboboxOptions } from '@headlessui/react'
import { MagnifyingGlassIcon } from '@heroicons/react/20/solid'
import QRCode from 'qrcode'
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

const classNames = (...classes) => classes.filter(Boolean).join(' ')

export default function Members() {
  const [members, setMembers] = useState([])
  const [search, setSearch] = useState('')
  const [memberQuery, setMemberQuery] = useState('')
  const [selectedMember, setSelectedMember] = useState(null)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(8)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [photoPreview, setPhotoPreview] = useState('')
  const [qrOpen, setQrOpen] = useState(false)
  const [qrMember, setQrMember] = useState(null)
  const [qrDataUrl, setQrDataUrl] = useState('')

  const fetchMembers = async () => {
    setLoading(true)
    setError('')
    try {
      const { data } = await api.get('/members')
      setMembers(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err?.response?.data ?? 'Unable to load members.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMembers()
  }, [])

  useEffect(() => {
    let isMounted = true
    const generate = async () => {
      if (!qrOpen || !qrMember) return
      try {
        const qrCanvas = document.createElement('canvas')
        await QRCode.toCanvas(qrCanvas, String(qrMember.id), {
          width: 240,
          margin: 2,
        })

        const nameLine = qrMember.fullName ?? 'Member'
        const idLine = `ID: ${qrMember.id}`
        const padding = 12
        const lineHeight = 18
        const textBlockHeight = lineHeight * 2 + 6
        const finalCanvas = document.createElement('canvas')
        finalCanvas.width = qrCanvas.width
        finalCanvas.height = qrCanvas.height + textBlockHeight + padding

        const ctx = finalCanvas.getContext('2d')
        if (!ctx) {
          throw new Error('Unable to generate QR image.')
        }

        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, finalCanvas.width, finalCanvas.height)
        ctx.drawImage(qrCanvas, 0, 0)

        ctx.fillStyle = '#0f172a'
        ctx.font = '600 14px system-ui, -apple-system, "Segoe UI", sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'top'
        ctx.fillText(nameLine, finalCanvas.width / 2, qrCanvas.height + 4)
        ctx.font = '500 12px system-ui, -apple-system, "Segoe UI", sans-serif'
        ctx.fillText(idLine, finalCanvas.width / 2, qrCanvas.height + 4 + lineHeight)

        const url = finalCanvas.toDataURL('image/png')
        if (isMounted) {
          setQrDataUrl(url)
        }
      } catch (err) {
        if (isMounted) {
          setError(err?.message ?? 'Unable to generate QR code.')
        }
      }
    }
    generate()
    return () => {
      isMounted = false
    }
  }, [qrOpen, qrMember])
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return members
    return members.filter((member) => {
      return (
        member.fullName?.toLowerCase().includes(term) ||
        member.email?.toLowerCase().includes(term) ||
        member.phone?.toLowerCase().includes(term)
      )
    })
  }, [search, members])

  const filteredMembers =
    memberQuery.trim() === ''
      ? members
      : members.filter((member) => {
          const name = member.fullName?.toLowerCase() ?? ''
          return name.includes(memberQuery.trim().toLowerCase())
        })

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize)

  const openCreate = () => {
    setForm(emptyForm)
    setPhotoPreview('')
    setModalOpen(true)
  }

  const openEdit = (member) => {
    setForm({
      id: member.id,
      fullName: member.fullName ?? '',
      phone: member.phone ?? '',
      email: member.email ?? '',
      birthDate: toInputDateValue(member.birthDate),
      emergencyContact: member.emergencyContact ?? '',
      notes: member.notes ?? '',
      photoBase64: member.photoBase64 ?? '',
      isActive: member.isActive ?? true,
    })
    setPhotoPreview(member.photoBase64 ?? '')
    setModalOpen(true)
  }

  const openQr = (member) => {
    setQrMember(member)
    setQrDataUrl('')
    setQrOpen(true)
  }

  const closeQr = () => {
    setQrOpen(false)
    setQrMember(null)
    setQrDataUrl('')
  }

  const closeModal = () => {
    setModalOpen(false)
    setForm(emptyForm)
    setPhotoPreview('')
  }

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

      if (form.id) {
        await api.put(`/members/${form.id}`, payload)
      } else {
        await api.post('/members', payload)
      }

      await fetchMembers()
      closeModal()
    } catch (err) {
      setError(err?.response?.data ?? 'Unable to save member.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (memberId) => {
    if (!window.confirm('Disable this member?')) return
    try {
      await api.delete(`/members/${memberId}`)
      await fetchMembers()
    } catch (err) {
      setError(err?.response?.data ?? 'Unable to delete member.')
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Members"
        title="Manage your members"
        description="Create, update, and search gym members."
        actions={
          <button onClick={openCreate} className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white">
            Add member
          </button>
        }
      />

      <div className="mt-6 flex flex-wrap items-center gap-4">
        <div className="w-full max-w-sm">
          <Combobox
            value={selectedMember}
            onChange={(member) => {
              setSelectedMember(member)
              if (member) {
                setSearch(member.fullName ?? '')
              } else {
                setSearch('')
              }
              setMemberQuery('')
              setPage(1)
            }}
          >
            <div className="relative">
              <ComboboxInput
                className="h-10 w-full rounded-full border border-slate-200 bg-white py-2 pr-10 pl-10 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                displayValue={(member) => member?.fullName ?? ''}
                placeholder="Search members..."
                onChange={(event) => {
                  setMemberQuery(event.target.value)
                  setSearch(event.target.value)
                  setSelectedMember(null)
                  setPage(1)
                }}
              />
              <MagnifyingGlassIcon
                className="pointer-events-none absolute left-3 top-2.5 size-5 text-slate-400"
                aria-hidden="true"
              />
            </div>
            <ComboboxOptions className="mt-2 max-h-60 overflow-auto rounded-2xl border border-slate-200 bg-white py-2 text-sm shadow-lg">
              {selectedMember ? (
                <ComboboxOption
                  value={null}
                  className={({ active }) =>
                    classNames(
                      'cursor-default select-none px-4 py-2 text-slate-500',
                      active && 'bg-slate-100 text-slate-900'
                    )
                  }
                >
                  Clear selection
                </ComboboxOption>
              ) : null}
              {filteredMembers.length === 0 ? (
                <div className="px-4 py-2 text-slate-500">No members found.</div>
              ) : (
                filteredMembers.map((member) => (
                  <ComboboxOption
                    key={member.id}
                    value={member}
                    className={({ active }) =>
                      classNames(
                        'cursor-default select-none px-4 py-2 text-slate-700',
                        active && 'bg-slate-100 text-slate-900'
                      )
                    }
                  >
                    {member.fullName}
                  </ComboboxOption>
                ))
              )}
            </ComboboxOptions>
          </Combobox>
        </div>
        <div className="text-sm text-slate-500">
          {filtered.length} members • page {page} of {totalPages}
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
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">Member</th>
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td className="px-4 py-6 text-sm text-slate-500" colSpan={5}>
                  Loading members...
                </td>
              </tr>
            ) : paged.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-sm text-slate-500" colSpan={5}>
                  No members found.
                </td>
              </tr>
            ) : (
              paged.map((member) => (
                <tr key={member.id} className="hover:bg-slate-50/60">
                  <td className="px-4 py-4 text-slate-500">{member.id}</td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 overflow-hidden rounded-full bg-indigo-50 text-indigo-600">
                        {member.photoBase64 ? (
                          <img src={member.photoBase64} alt={member.fullName} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-sm font-semibold">
                            {member.fullName?.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900">{member.fullName}</div>
                        <div className="text-xs text-slate-500">{member.email || '—'}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-slate-600">
                    <div>{member.phone || '—'}</div>
                    <div className="text-xs text-slate-400">{member.emergencyContact || 'No emergency contact'}</div>
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        member.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-600'
                      }`}
                    >
                      {member.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => openQr(member)}
                        className="rounded-full border border-indigo-200 px-3 py-1 text-xs font-semibold text-indigo-600 hover:bg-indigo-50"
                      >
                        QR
                      </button>
                      <button
                        onClick={() => openEdit(member)}
                        className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(member.id)}
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
                  {form.id ? 'Edit member' : 'Create member'}
                </h3>
                <p className="mt-1 text-sm text-slate-500">Update member profile and status.</p>
              </div>
              <button onClick={closeModal} className="text-sm text-slate-500 hover:text-slate-900">
                Close
              </button>
            </div>

            <form onSubmit={handleSave} className="mt-6 space-y-4">
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
                  {saving ? 'Saving...' : 'Save member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {qrOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-4 text-center sm:items-center">
          <div className="w-full max-w-sm transform overflow-hidden rounded-2xl bg-white p-6 text-left shadow-xl transition-all">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-display text-xl text-slate-900">Member QR</h3>
                <p className="mt-1 text-sm text-slate-500">Scan to check in.</p>
              </div>
              <button onClick={closeQr} className="text-sm text-slate-500 hover:text-slate-900">
                Close
              </button>
            </div>
            <div className="mt-6 flex flex-col items-center gap-3">
              {qrDataUrl ? (
                <img src={qrDataUrl} alt={`Member ${qrMember?.id}`} className="h-56 w-56" />
              ) : (
                <div className="h-56 w-56 animate-pulse rounded-2xl bg-slate-100" />
              )}
              <div className="text-center">
                <div className="text-sm font-semibold text-slate-900">{qrMember?.fullName ?? 'Member'}</div>
                <div className="text-xs text-slate-500">ID: {qrMember?.id ?? '-'}</div>
              </div>
              {qrDataUrl ? (
                <a
                  href={qrDataUrl}
                  download={`member-${qrMember?.id ?? 'qr'}.png`}
                  className="rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Download QR
                </a>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
